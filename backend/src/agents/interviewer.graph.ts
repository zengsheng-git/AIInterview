/**
 * 面试 Agent
 *
 * 简化设计：直接用纯函数 + LLM 调用，不上 LangGraph 状态机
 * （状态通过 Prisma 持久化在 ChatMessage 中）
 */
import { LlmService } from '../llm/llm.service'
import {
  INTERVIEWER_SYSTEM,
  buildAskQuestionPrompt,
  buildEvaluatePrompt,
} from '../llm/prompts/interviewer'
import {
  FollowupDecisionSchema,
  InterviewQuestionSchema,
  type FollowupDecisionResult,
  type InterviewReportResult,
} from '../llm/schemas/interview.schema'
import { InterviewReportSchema } from '../llm/schemas/interview.schema'
import {
  SCORER_SYSTEM,
  buildScorerUserPrompt,
  REFERENCE_ANSWER_SYSTEM,
  buildReferenceAnswerPrompt,
} from '../llm/prompts/scorer'
import {
  StructuredResumeSchema,
  type StructuredResume,
} from '../llm/schemas/resume.schema'
import {
  RESUME_PARSER_SYSTEM,
  buildResumeParserUserPrompt,
} from '../llm/prompts/resume-parser'
import { extractJson } from '../llm/json.util'

/**
 * 出题（首个问题或切题时调用）
 */
export async function askQuestion(
  llm: LlmService,
  params: {
    jdTitle: string
    currentSkill: string
    currentType: 'basic' | 'project' | 'system' | 'scenario'
    currentDifficulty: 1 | 2 | 3
    depth: number
    previousQA: Array<{ question: string; answer: string }>
    resumeContext?: string
    questionCount: number
    totalQuestions: number
  },
): Promise<{ question: string; hint: string }> {
  const prompt = buildAskQuestionPrompt(params)
  const raw = await llm.chat({
    messages: [
      { role: 'system', content: INTERVIEWER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    jsonMode: true,
  })
  try {
    const obj = extractJson<any>(raw)
    const parsed = InterviewQuestionSchema.parse(obj)
    return { question: parsed.question, hint: parsed.hint || '' }
  } catch (e: any) {
    // Fallback：直接把整个 LLM 输出当问题
    console.error(`[askQuestion] 解析失败: ${e.message}\n原始: ${raw.slice(0, 500)}`)
    const obj = extractJson<any>(raw)
    return {
      question: String(obj?.question || obj?.问题 || raw.slice(0, 200)),
      hint: String(obj?.hint || obj?.提示 || ''),
    }
  }
}

/**
 * 评估用户回答 + 决策下一步（含难度自适应）
 */
export async function evaluateAnswer(
  llm: LlmService,
  params: {
    question: string
    answer: string
    skill: string
    type: string
    difficulty: number
    depth: number
    maxDepth: number
    recentPerformance?: {
      avgScore: number
      recommendedNextDifficulty: number
    }
  },
): Promise<FollowupDecisionResult> {
  const prompt = buildEvaluatePrompt(params)
  const raw = await llm.reason({
    messages: [
      { role: 'system', content: INTERVIEWER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
  })
  try {
    const obj = extractJson<any>(raw)
    return FollowupDecisionSchema.parse(obj)
  } catch (e: any) {
    console.error(`[evaluateAnswer] 解析失败: ${e.message}\n原始: ${raw.slice(0, 500)}`)
    const obj = extractJson<any>(raw)
    return {
      decision: 'next_question',
      reasoning: '解析失败，自动切题',
      evaluation: { depthScore: 50, clarity: 50, accuracy: 50 },
      nextQuestion: undefined,
      nextDifficulty: params.difficulty,
      feedback: String(obj?.feedback || ''),
    }
  }
}

/**
 * 生成最终评估报告
 */
export async function generateReport(
  llm: LlmService,
  jdTitle: string,
  qaList: Array<{ question: string; answer: string; skill: string; evaluation?: any }>,
): Promise<InterviewReportResult> {
  const raw = await llm.reason({
    messages: [
      { role: 'system', content: SCORER_SYSTEM },
      { role: 'user', content: buildScorerUserPrompt({ jdTitle, qaList }) },
    ],
    temperature: 0.4,
  })
  try {
    const obj = extractJson<any>(raw)
    return InterviewReportSchema.parse(obj)
  } catch (e: any) {
    console.error(`[generateReport] 解析失败: ${e.message}\n原始: ${raw.slice(0, 500)}`)
    // ⭐ 打印 LLM 实际看到的 qaList
    console.log('='.repeat(60))
    console.log('[generateReport] LLM 实际看到的 qaList:')
    qaList.forEach((q, i) => {
      console.log(
        `  [${i}] Q: ${q.question.slice(0, 60).replace(/\n/g, ' ')}`,
      )
      console.log(
        `      A: ${q.answer.slice(0, 60).replace(/\n/g, ' ')}`,
      )
      console.log(`      skill: ${q.skill}, depth: ${q.evaluation?.depthScore || '-'}`)
    })
    console.log('='.repeat(60))
    // Fallback：基于历史 evaluation 计算真实平均分
    const evals = qaList.map((q) => q.evaluation).filter(Boolean) as any[]
    const obj = extractJson<any>(raw)
    // ⭐ Fallback 用真实数据算平均分（0 分不算 60）
    const avg = (k: string) => {
      if (evals.length === 0) return 0
      const total = evals.reduce((s, e) => s + (Number(e?.[k]) || 0), 0)
      return Math.round(total / evals.length)
    }
    return {
      radar: {
        basic: avg('accuracy'),
        project: avg('depthScore'),
        systemDesign: avg('depthScore'),
        communication: avg('clarity'),
      },
      overallScore: Math.round(
        (avg('depthScore') + avg('clarity') + avg('accuracy')) / 3,
      ),
      summary: String(obj?.summary || obj?.总结 || `本次面试共 ${qaList.length} 道题，整体表现可参考雷达图。`),
      strengths: Array.isArray(obj?.strengths) ? obj.strengths.map(String) : ['能完整作答'],
      weaknesses: Array.isArray(obj?.weaknesses) ? obj.weaknesses.map(String) : [],
      suggestions: Array.isArray(obj?.suggestions)
        ? obj.suggestions.map((s: any) => ({
            area: String(s?.area || s?.方向 || '综合能力'),
            action: String(s?.action || s?.建议 || '继续深入练习'),
            priority: ['high', 'medium', 'low'].includes(s?.priority) ? s.priority : 'medium',
          }))
        : [
            { area: '项目深度', action: '尝试用 STAR 法则组织项目回答', priority: 'high' },
            { area: '技术细节', action: '结合实际项目讲清技术选型理由', priority: 'medium' },
          ],
    }
  }
}

/**
 * 为每道题生成标准参考答案
 */
export async function generateReferenceAnswers(
  llm: LlmService,
  jdTitle: string,
  qaList: Array<{
    question: string
    answer: string
    skill: string
    type?: string
    difficulty?: number
  }>,
): Promise<Array<{ questionIndex: number; referenceAnswer: string }>> {
  if (qaList.length === 0) return []

  const raw = await llm.chat({
    messages: [
      { role: 'system', content: REFERENCE_ANSWER_SYSTEM },
      { role: 'user', content: buildReferenceAnswerPrompt({ jdTitle, qaList }) },
    ],
    temperature: 0.5,
    jsonMode: true,
  })

  try {
    const obj = extractJson<any>(raw)
    const answers = Array.isArray(obj?.answers) ? obj.answers : []
    return answers
      .filter((a: any) => a && a.questionIndex)
      .map((a: any) => ({
        questionIndex: Number(a.questionIndex) || 0,
        referenceAnswer: String(a.referenceAnswer || a.参考答案 || '暂无参考答案'),
      }))
      .sort((a: { questionIndex: number }, b: { questionIndex: number }) => a.questionIndex - b.questionIndex)
  } catch (e: any) {
    console.error(`[generateReferenceAnswers] 解析失败: ${e.message}\n原始: ${raw.slice(0, 500)}`)
    // Fallback：每题给一个通用提示
    return qaList.map((_, i) => ({
      questionIndex: i + 1,
      referenceAnswer: `参考答案生成失败，请参考你的回答复盘（${raw.slice(0, 100)}...）`,
    }))
  }
}

/**
 * 把原始简历文本压缩成结构化数据
 * 用于后续出题 LLM 精准结合简历
 */
export async function parseResume(
  llm: LlmService,
  resumeText: string,
): Promise<StructuredResume> {
  if (!resumeText?.trim()) {
    return {
      candidate: { yearsOfExperience: 0 },
      skills: [],
      projects: [],
      highlights: [],
    }
  }

  const raw = await llm.chat({
    messages: [
      { role: 'system', content: RESUME_PARSER_SYSTEM },
      { role: 'user', content: buildResumeParserUserPrompt(resumeText.slice(0, 3000)) },
    ],
    temperature: 0.3,
    jsonMode: true,
  })

  try {
    const obj = extractJson<any>(raw)
    return StructuredResumeSchema.parse(obj)
  } catch (e: any) {
    console.error(`[parseResume] 解析失败: ${e.message}\n原始: ${raw.slice(0, 500)}`)
    // Fallback：从简历里尽力提取
    const obj = extractJson<any>(raw)
    return {
      candidate: {
        yearsOfExperience: Number(obj?.candidate?.yearsOfExperience) || 0,
        currentRole: obj?.candidate?.currentRole,
        education: obj?.candidate?.education,
      },
      skills: Array.isArray(obj?.skills) ? obj.skills : [],
      projects: Array.isArray(obj?.projects) ? obj.projects : [],
      highlights: Array.isArray(obj?.highlights) ? obj.highlights : [],
    }
  }
}
