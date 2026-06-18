import { z } from 'zod'

/**
 * 简历解析结果（用于简历匹配）
 */
export const ResumeParseSchema = z.object({
  candidate: z
    .object({
      yearsOfExperience: z.number().describe('工作年限'),
      currentRole: z.string().optional(),
    })
    .optional(),
  skills: z
    .array(
      z.object({
        name: z.string(),
        proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
        yearsUsed: z.number().optional(),
      }),
    )
    .describe('技能列表'),
  projects: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
        duration: z.string().optional(),
        techStack: z.array(z.string()),
        highlights: z.array(z.string()).describe('项目亮点'),
      }),
    )
    .describe('项目经历'),
})

export type ResumeParseResult = z.infer<typeof ResumeParseSchema>

/**
 * 结构化简历（用于面试出题 Prompt）
 * 由 LLM 从原始简历文本中提取压缩得到
 */
export const StructuredResumeSchema = z.object({
  candidate: z
    .object({
      yearsOfExperience: z.number().describe('工作年限'),
      currentRole: z.string().optional().describe('当前职位'),
      education: z.string().optional().describe('学历'),
    })
    .describe('候选人基本信息'),
  skills: z
    .array(
      z.object({
        name: z.string().describe('技能名称'),
        proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).describe('熟练度'),
        yearsUsed: z.number().optional().describe('使用年限'),
      }),
    )
    .min(1)
    .describe('技能列表（按熟练度排序）'),
  projects: z
    .array(
      z.object({
        name: z.string().describe('项目名称'),
        role: z.string().optional().describe('担任角色'),
        duration: z.string().optional().describe('项目周期'),
        techStack: z.array(z.string()).describe('技术栈'),
        highlights: z.array(z.string()).describe('项目亮点/成果'),
        keyMetrics: z.array(z.string()).optional().describe('关键指标（如性能提升 X%）'),
      }),
    )
    .default([])
    .describe('项目经历（按时间倒序）'),
  highlights: z.array(z.string()).default([]).describe('候选人整体亮点'),
})

export type StructuredResume = z.infer<typeof StructuredResumeSchema>

/**
 * 简历-JD 匹配结果
 */
export const ResumeMatchSchema = z.object({
  overallScore: z.number().min(0).max(100).describe('总匹配分 0-100'),
  dimensionScores: z.object({
    skills: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    projects: z.number().min(0).max(100),
  }),
  matchedSkills: z.array(z.string()).describe('匹配的技能'),
  missingSkills: z.array(z.string()).describe('缺失的技能'),
  highlights: z.array(z.string()).describe('简历亮点'),
  gaps: z.array(z.string()).describe('简历与 JD 的差距'),
  predictedQuestions: z
    .array(
      z.object({
        question: z.string(),
        reason: z.string().describe('为什么会被问到'),
        category: z.enum(['basic', 'project', 'system', 'pressure']),
      }),
    )
    .describe('预测会被问到的压力面问题'),
})

export type ResumeMatchResult = z.infer<typeof ResumeMatchSchema>
