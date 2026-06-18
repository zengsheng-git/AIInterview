import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { LlmService } from '../../llm/llm.service'
import {
  askQuestion,
  evaluateAnswer,
  generateReport,
  parseResume,
} from '../../agents/interviewer.graph'
import { formatStructuredResumeForPrompt } from '../../agents/resume-formatter'
import type { StructuredResume } from '../../llm/schemas/resume.schema'
import type { FollowupDecisionResult, InterviewReportResult } from '../../llm/schemas/interview.schema'

/**
 * 题目编排策略
 * - 每个技能分配 3 个类型槽位：basic → project → system
 * - 总题数 = 技能数 × 3
 * - 难度从 1 起步，根据 LLM 自适应调整
 */
type QuestionType = 'basic' | 'project' | 'system' | 'scenario'
const TYPE_ORDER: QuestionType[] = ['basic', 'project', 'system']
const DIFFICULTY_BY_TYPE: Record<QuestionType, number> = {
  basic: 1,
  project: 2,
  system: 3,
  scenario: 2,
}

/**
 * 根据 questionMode 编排题序（决定要考哪些技能的哪些类型）
 * 返回：[{ skill, type, difficulty }, ...] 顺序排列
 */
function buildQuestionPlan(
  skillsToCover: string[],
  mode: 'quick' | 'standard' | 'deep',
): Array<{ skill: string; type: QuestionType; difficulty: number }> {
  const plan: Array<{ skill: string; type: QuestionType; difficulty: number }> = []

  if (mode === 'quick') {
    // 快速：3 题 = 前 3 个技能 × basic
    skillsToCover.slice(0, 3).forEach((skill) => {
      plan.push({ skill, type: 'basic', difficulty: 1 })
    })
  } else if (mode === 'standard') {
    // 标准：5 题 = 选 2-3 个最重要技能，每个技能 basic + project
    const topSkills = skillsToCover.slice(0, 3)
    // 第 1-2 个技能: basic + project
    // 第 3 个技能: basic
    topSkills.forEach((skill, i) => {
      plan.push({ skill, type: 'basic', difficulty: 2 })
      if (i < 2) plan.push({ skill, type: 'project', difficulty: 2 })
    })
  } else {
    // deep：8 题 = 前 3 个技能 × 全 3 类
    const topSkills = skillsToCover.slice(0, 3)
    topSkills.forEach((skill) => {
      TYPE_ORDER.forEach((type) => {
        plan.push({ skill, type, difficulty: DIFFICULTY_BY_TYPE[type] })
      })
    })
  }

  return plan
}

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name)

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
  ) {}

  /**
   * 启动面试
   * @param questionMode 题目数量模式：'quick' | 'standard' | 'deep'
   *   - quick: 最多 3 题，只考 basic
   *   - standard: 最多 5 题，2-3 个技能 × basic+project
   *   - deep: 最多 8 题，多技能 × 全 3 类型
   */
  async start(params: {
    jdId: string
    resumeId?: string
    mode: 'practice' | 'strict'
    questionMode?: 'quick' | 'standard' | 'deep'
  }) {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id: params.jdId } })
    if (!jd) throw new NotFoundException('JD 不存在')

    const skills = JSON.parse(jd.skills) as Array<{ name: string; weight: number }>
    const skillsToCover = skills.sort((a, b) => b.weight - a.weight).map((s) => s.name)

    // 加载简历（如果提供）→ 调 LLM 预处理成结构化数据
    let resumeContext = ''
    let resumeRawText = ''
    if (params.resumeId) {
      const resume = await this.prisma.resume.findUnique({ where: { id: params.resumeId } })
      if (resume?.rawText) {
        resumeRawText = resume.rawText
        this.logger.log(`📋 预处理简历（${resume.rawText.length} 字符）...`)
        const structured = await parseResume(this.llm, resume.rawText)
        resumeContext = formatStructuredResumeForPrompt(structured)
        this.logger.log(`✅ 简历结构化完成：${structured.skills.length} 技能，${structured.projects.length} 项目`)
      }
    }

    // 按 questionMode 编排题序
    const questionMode = params.questionMode || 'deep'  // 默认 deep（兼容旧调用）
    const plan = buildQuestionPlan(skillsToCover, questionMode)
    const totalQuestions = plan.length
    const firstItem = plan[0]
    const firstSkill = firstItem.skill
    const firstType = firstItem.type
    const firstDifficulty = firstItem.difficulty

    const session = await this.prisma.interviewSession.create({
      data: {
        jdId: params.jdId,
        resumeId: params.resumeId,
        mode: params.mode,
        config: JSON.stringify({
          skillsToCover,
          maxDepth: 2,
          plan,                            // ⭐ 完整题序
          currentPlanIndex: 0,             // ⭐ 当前在 plan 的位置
          currentDifficulty: firstDifficulty,
          currentQuestionIndex: 0,
          totalQuestions,
          resumeContext,
          recentEvaluations: [],
          questionMode,                    // ⭐ 记录用了哪个模式
        }),
        status: 'active',
      },
    })

    // 出第一个题
    const first = await askQuestion(this.llm, {
      jdTitle: jd.title,
      currentSkill: firstSkill,
      currentType: firstType,
      currentDifficulty: firstDifficulty as 1 | 2 | 3,
      depth: 0,
      previousQA: [],
      resumeContext,
      questionCount: 0,
      totalQuestions,
    })

    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'interviewer',
        content: first.question,
        meta: JSON.stringify({
          skill: firstSkill,
          type: firstType,
          difficulty: firstDifficulty,
          depth: 0,
          hint: first.hint,
          questionIndex: 0,
        }),
      },
    })

    return {
      sessionId: session.id,
      mode: session.mode,
      jdTitle: jd.title,
      jdRawText: jd.rawText,                // ⭐ 原始 JD 文本（前端可显示）
      resumeRawText,                        // ⭐ 简历原文（前端可显示）
      firstQuestion: first.question,
      currentSkill: firstSkill,
      currentType: firstType,
      currentDifficulty: firstDifficulty,
      hint: first.hint,
      skillsToCover,
      totalQuestions,
      questionIndex: 0,
    }
  }

  /**
   * 提交回答
   */
  async chat(params: { sessionId: string; answer: string }) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: params.sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!session) throw new NotFoundException('会话不存在')

    // ⭐ 如果 session 已 completed/aborted，自动生成报告并返回 ended 状态
    //    避免前端继续提交时抛 400
    if (session.status !== 'active') {
      this.logger.log(
        `⚠️ chat() 收到已结束会话 ${session.id} (status=${session.status})，自动生成报告`,
      )
      let report = null
      try {
        report = await this.generateReportFromSession(session.id)
        await this.prisma.interviewReport.upsert({
          where: { sessionId: session.id },
          create: {
            sessionId: session.id,
            scores: JSON.stringify(report.radar),
            summary: report.summary,
            suggestions: JSON.stringify(report.suggestions),
          },
          update: {
            scores: JSON.stringify(report.radar),
            summary: report.summary,
            suggestions: JSON.stringify(report.suggestions),
          },
        })
      } catch (e: any) {
        this.logger.error(`自动生成报告失败: ${e.message}`)
      }
      return {
        status: 'ended' as const,
        evaluation: undefined,
        feedback: report
          ? '面试已完成，自动为您生成了评估报告。'
          : '面试已完成',
      }
    }

    const jd = await this.prisma.jobDescription.findUnique({ where: { id: session.jdId } })
    if (!jd) throw new NotFoundException('JD 不存在')

    // 取当前题目信息（需要在 candidate 创建之前获取 questionIndex）
    const lastInterviewer = [...session.messages].reverse().find((m) => m.role === 'interviewer')
    if (!lastInterviewer) throw new BadRequestException('找不到当前问题')
    const lastMeta = JSON.parse(lastInterviewer.meta || '{}')

    // 记录用户回答（带 questionIndex，方便 end() 精确配对）
    const lastCandidate = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'candidate',
        content: (params.answer || '').trim() || '(用户跳过本题)',
        meta: JSON.stringify({ questionIndex: lastMeta.questionIndex ?? 0 }),
      },
    })

    const config = JSON.parse(session.config) as {
      skillsToCover: string[]
      maxDepth: number
      plan: Array<{ skill: string; type: QuestionType; difficulty: number }>
      currentPlanIndex: number
      currentDifficulty: number
      currentQuestionIndex: number
      totalQuestions: number
      resumeContext: string
      recentEvaluations: any[]
      questionMode: string
    }

    // 准备"最近表现"（用于难度自适应）
    const recentEvals = config.recentEvaluations || []
    const currentSkill = lastMeta.skill
    const currentType = lastMeta.type || 'basic'
    const currentDepth = lastMeta.depth || 0
    const currentDifficulty = lastMeta.difficulty || 2
    const avgScore = recentEvals.length
      ? Math.round(
          recentEvals.reduce(
            (s, e) => s + (e?.evaluation?.depthScore || 50),
            0,
          ) / recentEvals.length,
        )
      : 50

    // 1. 评估
    const decision: FollowupDecisionResult = await evaluateAnswer(this.llm, {
      question: lastInterviewer.content,
      answer: params.answer,
      skill: currentSkill,
      type: currentType,
      difficulty: currentDifficulty,
      depth: currentDepth,
      maxDepth: config.maxDepth,
      recentPerformance: {
        avgScore,
        recommendedNextDifficulty: config.currentDifficulty,
      },
    })

    // 把本次评估加入"最近表现"
    config.recentEvaluations = [...recentEvals, { skill: currentSkill, evaluation: decision.evaluation }].slice(-5)

    // ⭐ 把 evaluation 存到候选人消息的 meta（end() 时读取用）
    if (lastCandidate) {
      // ⭐ 合并 evaluation 到已有 meta（保留 questionIndex）
      let existingMeta: any = {}
      try { existingMeta = JSON.parse(lastCandidate.meta || '{}') } catch {}
      await this.prisma.chatMessage.update({
        where: { id: lastCandidate.id },
        data: {
          meta: JSON.stringify({
            ...existingMeta,
            evaluation: decision.evaluation,
            feedback: decision.feedback,
          }),
        },
      })
    }

    // 2. 决策路由
    if (decision.decision === 'end' || config.currentQuestionIndex + 1 >= config.totalQuestions) {
      await this.prisma.interviewSession.update({
        where: { id: session.id },
        data: { status: 'completed', endedAt: new Date() },
      })
      return {
        status: 'ended' as const,
        evaluation: decision.evaluation,
        feedback: decision.feedback,
      }
    }

    let nextSkill = currentSkill
    let nextType: QuestionType = currentType
    let nextDepth = currentDepth
    let nextDifficulty = decision.nextDifficulty || config.currentDifficulty
    let nextQuestion = ''
    let nextHint = ''
    let nextQuestionIndex = config.currentQuestionIndex

    if (decision.decision === 'followup') {
      // ⭐ 硬兜底：只有答得不错（depthScore > 40）才追问
      // 否则直接切下一题（真实面试官不会"教学生"）
      if (decision.evaluation.depthScore <= 40) {
        this.logger.log(
          `⚠️ 候选人答得不够好 (depth=${decision.evaluation.depthScore})，跳过追问，强制切下一题`,
        )
        // 走 next_question 流程
        const nextPlanIndex = config.currentPlanIndex + 1
        if (nextPlanIndex >= config.plan.length) {
          await this.prisma.interviewSession.update({
            where: { id: session.id },
            data: { status: 'completed', endedAt: new Date() },
          })
          return {
            status: 'ended' as const,
            evaluation: decision.evaluation,
            feedback: decision.feedback,
          }
        }
        const nextItem = config.plan[nextPlanIndex]
        nextQuestionIndex = config.currentQuestionIndex + 1
        nextSkill = nextItem.skill
        nextType = nextItem.type
        nextDepth = 0
        nextDifficulty = nextItem.difficulty
        config.currentPlanIndex = nextPlanIndex

        const newQ = await askQuestion(this.llm, {
          jdTitle: jd.title,
          currentSkill: nextSkill,
          currentType: nextType,
          currentDifficulty: nextDifficulty as 1 | 2 | 3,
          depth: 0,
          previousQA: session.messages
            .filter((m) => m.role === 'interviewer')
            .slice(-3)
            .map((m) => {
              const a = session.messages.find(
                (x) => x.role === 'candidate' && x.createdAt > m.createdAt,
              )
              return { question: m.content, answer: a?.content || '' }
            }),
          resumeContext: config.resumeContext,
          questionCount: nextQuestionIndex,
          totalQuestions: config.totalQuestions,
        })
        nextQuestion = newQ.question
        nextHint = newQ.hint
      } else {
        // 正常追问（候选人答得不错）
        nextDepth = Math.min(currentDepth + 1, config.maxDepth)
        nextQuestion = decision.nextQuestion || '能再详细说说吗？'
        // 追问不增加 plan 索引
      }
    } else {
      // next_question：切到 plan 下一题
      const nextPlanIndex = config.currentPlanIndex + 1
      if (nextPlanIndex >= config.plan.length) {
        // 计划内题目都答完了，结束
        await this.prisma.interviewSession.update({
          where: { id: session.id },
          data: { status: 'completed', endedAt: new Date() },
        })
        return {
          status: 'ended' as const,
          evaluation: decision.evaluation,
          feedback: decision.feedback,
        }
      }
      const nextItem = config.plan[nextPlanIndex]
      nextQuestionIndex = config.currentQuestionIndex + 1
      nextSkill = nextItem.skill
      nextType = nextItem.type
      nextDepth = 0
      // 自适应调整下一题难度（在 plan 给的初始难度基础上 ±1）
      const planDifficulty = nextItem.difficulty
      if (decision.evaluation.depthScore < 50) {
        nextDifficulty = Math.max(1, planDifficulty - 1)
      } else if (decision.evaluation.depthScore > 75) {
        nextDifficulty = Math.min(3, planDifficulty + 1)
      } else {
        nextDifficulty = planDifficulty
      }
      nextDifficulty = Math.max(1, Math.min(3, nextDifficulty))
      config.currentPlanIndex = nextPlanIndex

      const newQ = await askQuestion(this.llm, {
        jdTitle: jd.title,
        currentSkill: nextSkill,
        currentType: nextType,
        currentDifficulty: nextDifficulty as 1 | 2 | 3,
        depth: 0,
        previousQA: session.messages
          .filter((m) => m.role === 'interviewer')
          .slice(-3)
          .map((m) => {
            const a = session.messages.find((x) => x.role === 'candidate' && x.createdAt > m.createdAt)
            return { question: m.content, answer: a?.content || '' }
          }),
        resumeContext: config.resumeContext,
        questionCount: nextQuestionIndex,
        totalQuestions: config.totalQuestions,
      })
      nextQuestion = newQ.question
      nextHint = newQ.hint
    }

    // 保存更新后的 config
    config.currentDifficulty = nextDifficulty
    config.currentQuestionIndex = nextQuestionIndex

    await this.prisma.interviewSession.update({
      where: { id: session.id },
      data: { config: JSON.stringify(config) },
    })

    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'interviewer',
        content: nextQuestion,
        meta: JSON.stringify({
          skill: nextSkill,
          type: nextType,
          difficulty: nextDifficulty,
          depth: nextDepth,
          hint: nextHint,
          questionIndex: nextQuestionIndex,
        }),
      },
    })

    return {
      status: 'continue' as const,
      evaluation: decision.evaluation,
      feedback: decision.feedback,
      currentSkill: nextSkill,
      currentType: nextType,
      currentDifficulty: nextDifficulty,
      currentDepth: nextDepth,
      nextQuestion,
      hint: nextHint,
      progress: {
        current: nextQuestionIndex + 1,
        total: config.totalQuestions,
      },
    }
  }

  /**
   * 结束面试 + 生成报告
   */
  async end(sessionId: string): Promise<InterviewReportResult> {
    // ⭐ 调 LLM 生成报告（基于完整 Q&A 列表）
    const report = await this.generateReportFromSession(sessionId)

    await this.prisma.interviewReport.upsert({
      where: { sessionId },
      create: {
        sessionId,
        scores: JSON.stringify(report.radar),
        summary: report.summary,
        suggestions: JSON.stringify(report.suggestions),
      },
      update: {
        scores: JSON.stringify(report.radar),
        summary: report.summary,
        suggestions: JSON.stringify(report.suggestions),
      },
    })

    await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: 'completed', endedAt: new Date() },
    })

    return report
  }

  /**
   * 从已有 session 数据生成报告（调 LLM）
   * 给 end() 和 chat() 兜底共用
   */
  private async generateReportFromSession(sessionId: string): Promise<InterviewReportResult> {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, jd: true },
    })
    if (!session) throw new NotFoundException('会话不存在')

    const qaList = this.buildQaList(session.messages)
    if (qaList.length === 0) {
      throw new BadRequestException('没有对话记录')
    }

    return generateReport(this.llm, session.jd.title, qaList)
  }

  /**
   * 配对 Q&A 列表（最简算法）
   * - 按 questionIndex 严格匹配 interviewer 和 candidate
   * - candidate 消息 meta 中有 questionIndex（chat 时写入）
   */
  private buildQaList(messages: any[]): Array<{ question: string; answer: string; skill: string; evaluation?: any; questionIndex?: number }> {
    // 1. 收集 depth=0 的 interviewer，key 为 questionIndex
    const interviewersByIdx = new Map<number, any>()
    for (const m of messages) {
      if (m.role !== 'interviewer') continue
      let qMeta: any = {}
      try { qMeta = JSON.parse(m.meta || '{}') } catch {}
      const idx = qMeta.questionIndex
      const depth = qMeta.depth ?? 0
      if (typeof idx === 'number' && idx >= 0 && depth === 0) {
        // 同 idx 只保留第一次（第一条就是真正的题目）
        if (!interviewersByIdx.has(idx)) {
          interviewersByIdx.set(idx, m)
        }
      }
    }

    // 2. collection candidates，key 为 questionIndex（取第一个）
    const candidatesByIdx = new Map<number, any>()
    for (const m of messages) {
      if (m.role !== 'candidate') continue
      let aMeta: any = {}
      try { aMeta = JSON.parse(m.meta || '{}') } catch {}
      const idx = aMeta.questionIndex
      if (typeof idx === 'number' && idx >= 0 && !candidatesByIdx.has(idx)) {
        candidatesByIdx.set(idx, m)
      }
    }

    // 3. 按 idx 配对
    const sortedIdxs = Array.from(interviewersByIdx.keys()).sort((a, b) => a - b)
    const qaList: Array<{ question: string; answer: string; skill: string; evaluation?: any; questionIndex?: number }> = []

    for (const idx of sortedIdxs) {
      const q = interviewersByIdx.get(idx)
      const candidate = candidatesByIdx.get(idx)
      if (!q) continue

      const qMeta = JSON.parse(q.meta || '{}')
      const aMeta = candidate ? JSON.parse(candidate.meta || '{}') : {}
      qaList.push({
        question: q.content,
        answer: candidate?.content || '(用户跳过本题)',
        skill: qMeta.skill || '通用',
        evaluation: aMeta.evaluation || undefined,
        questionIndex: idx,
      })
    }

    return qaList
  }

  async getReport(sessionId: string) {
    const report = await this.prisma.interviewReport.findUnique({ where: { sessionId } })
    if (!report) throw new NotFoundException('报告不存在')
    return {
      sessionId,
      radar: JSON.parse(report.scores),
      summary: report.summary,
      suggestions: JSON.parse(report.suggestions),
      createdAt: report.createdAt,
    }
  }

  async getMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })
  }
}
