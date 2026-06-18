import { z } from 'zod'

/**
 * JD 解析结果结构
 */
export const JdParseSchema = z.object({
  title: z.string().default('未命名岗位').describe('岗位名称'),
  skills: z
    .array(
      z.object({
        name: z.string().describe('技能名称，如 React 性能优化'),
        category: z.enum(['basic', 'project', 'system', 'soft']).describe('技能类别'),
        weight: z.number().min(1).max(5).describe('重要程度 1-5'),
        keywords: z.array(z.string()).describe('考察关键词'),
      }),
    )
    .min(1)
    .describe('核心技能点列表（至少 1 个）'),
  focusAreas: z
    .array(
      z.object({
        area: z.string().describe('考察方向'),
        depth: z.number().min(1).max(3).describe('建议追问深度'),
        sampleQuestions: z.array(z.string()).describe('示例问题'),
      }),
    )
    .default([])
    .describe('考察重点'),
  experience: z.string().optional().describe('经验要求'),
})

export type JdParseResult = z.infer<typeof JdParseSchema>
