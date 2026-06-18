import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { LlmService } from '../../llm/llm.service'
import { InterviewService } from '../interview/interview.service'
import { generateReferenceAnswers } from '../../agents/interviewer.graph'
import {
  generateMarkdownReport,
  type ReportContext,
  type QaItem,
} from './export.util'

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name)

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private interviewService: InterviewService,
  ) {}

  /**
   * 导出 Markdown 报告（含参考答案）
   */
  async exportMarkdown(sessionId: string): Promise<{
    filename: string
    content: string
    mimeType: string
  }> {
    const ctx = await this.buildReportContext(sessionId)
    const content = generateMarkdownReport(ctx)
    const safeTitle = ctx.jdTitle.replace(/[\\/:*?"<>|]/g, '_')
    const date = new Date().toISOString().slice(0, 10)
    return {
      filename: `面试报告_${safeTitle}_${date}.md`,
      content,
      mimeType: 'text/markdown',
    }
  }

  /**
   * 构建报告上下文（含 LLM 生成的参考答案）
   */
  private async buildReportContext(sessionId: string): Promise<ReportContext> {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        jd: true,
        report: true,
      },
    })
    if (!session) throw new NotFoundException(`Session ${sessionId} 不存在`)
    if (session.messages.length === 0) {
      throw new BadRequestException('没有对话记录')
    }

    // 拼 Q&A（按 questionIndex 分组）
    const interviewerMsgs = session.messages.filter((m) => m.role === 'interviewer')
    const qaRaw: Array<{
      question: string
      answer: string
      meta: any
    }> = []
    interviewerMsgs.forEach((q) => {
      const a = session.messages.find(
        (m) => m.role === 'candidate' && m.createdAt > q.createdAt,
      )
      const qMeta = JSON.parse(q.meta || '{}')
      const aMeta = JSON.parse(a?.meta || '{}')
      // ⭐ 把 evaluation 从 candidate 消息的 meta 合并进来
      const meta = {
        ...qMeta,
        evaluation: aMeta.evaluation || qMeta.evaluation,
        feedback: aMeta.feedback || qMeta.feedback,
      }
      qaRaw.push({
        question: q.content,
        answer: a?.content || '',
        meta,
      })
    })

    this.logger.log(`生成参考答案，${qaRaw.length} 道题...`)

    // 调用 LLM 生成所有参考答案
    const refAnswers = await generateReferenceAnswers(
      this.llm,
      session.jd.title,
      qaRaw.map((q) => ({
        question: q.question,
        answer: q.answer,
        skill: q.meta.skill || '通用',
        type: q.meta.type || 'basic',
        difficulty: q.meta.difficulty || 2,
      })),
    )

    // 组装 QaItem
    const qaList: QaItem[] = qaRaw.map((q, i) => {
      const ref = refAnswers.find((r) => r.questionIndex === i + 1)
      return {
        index: i + 1,
        question: q.question,
        answer: q.answer,
        referenceAnswer: ref?.referenceAnswer,
        skill: q.meta.skill || '通用',
        type: q.meta.type || 'basic',
        difficulty: q.meta.difficulty || 2,
        depth: q.meta.depth || 0,
        evaluation: q.meta.evaluation,
        feedback: q.meta.feedback,
      }
    })

    // 雷达图分数
    let radar = { basic: 0, project: 0, systemDesign: 0, communication: 0 }
    let overallScore = 0
    let summary = '请先完成面试后再导出报告'
    let strengths: string[] = []
    let weaknesses: string[] = []
    let suggestions: ReportContext['suggestions'] = []

    if (session.report) {
      radar = JSON.parse(session.report.scores)
      summary = session.report.summary
      strengths = []
      weaknesses = []
      suggestions = JSON.parse(session.report.suggestions)
    } else {
      // 没生成报告时基于所有 evaluation 计算（用真实分数，不用 50 兜底）
      const evals = qaRaw.map((q) => q.meta.evaluation).filter(Boolean) as any[]
      if (evals.length > 0) {
        const avg = (k: string) =>
          Math.round(
            evals.reduce((s, e) => s + (Number(e[k]) || 0), 0) / evals.length,
          )
        radar = {
          basic: avg('accuracy'),
          project: avg('depthScore'),
          systemDesign: avg('depthScore'),
          communication: avg('clarity'),
        }
        overallScore = Math.round((radar.basic + radar.project + radar.systemDesign + radar.communication) / 4)
      }
    }

    return {
      jdTitle: session.jd.title,
      date: new Date(session.startedAt).toISOString().slice(0, 19).replace('T', ' '),
      totalQuestions: qaList.length,
      radar,
      overallScore,
      summary,
      strengths,
      weaknesses,
      suggestions,
      qaList,
    }
  }
}
