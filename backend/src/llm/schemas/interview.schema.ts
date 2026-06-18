import { z } from 'zod'

/**
 * 单个面试问题
 */
export const InterviewQuestionSchema = z.object({
  question: z.string(),
  skill: z.string().describe('考察的技能点'),
  depth: z.number().min(0).max(3).describe('追问深度 0-3'),
  type: z.enum(['basic', 'project', 'system', 'scenario']),
  difficulty: z.number().min(1).max(3).default(2).describe('题目难度 1-3'),
  hint: z.string().optional().describe('练习模式下的提示'),
})

/**
 * 追问决策（评估用户回答后决定下一步）
 */
export const FollowupDecisionSchema = z.object({
  decision: z.enum(['followup', 'next_question', 'end']),
  reasoning: z.string().describe('决策理由'),
  evaluation: z
    .object({
      depthScore: z.number().min(0).max(100).describe('回答深度 0-100'),
      clarity: z.number().min(0).max(100).describe('表达清晰度 0-100'),
      accuracy: z.number().min(0).max(100).describe('技术准确度 0-100'),
    })
    .describe('本次回答的评分'),
  nextQuestion: z.string().optional().describe('下一个问题（追问时用）'),
  nextDifficulty: z.number().min(1).max(3).optional().describe('建议下一题难度 1-3'),
  feedback: z.string().optional().describe('给候选人的反馈'),
})

/**
 * 面试最终评估报告
 */
export const InterviewReportSchema = z.object({
  radar: z.object({
    basic: z.number().min(0).max(100).describe('基础知识'),
    project: z.number().min(0).max(100).describe('项目经验'),
    systemDesign: z.number().min(0).max(100).describe('系统设计'),
    communication: z.number().min(0).max(100).describe('沟通表达'),
  }),
  overallScore: z.number().min(0).max(100),
  summary: z.string().describe('整体评价'),
  strengths: z.array(z.string()).describe('亮点'),
  weaknesses: z.array(z.string()).describe('不足'),
  suggestions: z
    .array(
      z.object({
        area: z.string(),
        action: z.string().describe('具体改进建议'),
        priority: z.enum(['high', 'medium', 'low']),
      }),
    )
    .describe('改进建议'),
})

export type InterviewReportResult = z.infer<typeof InterviewReportSchema>
export type FollowupDecisionResult = z.infer<typeof FollowupDecisionSchema>
