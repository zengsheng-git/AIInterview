import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { LlmService } from '../../llm/llm.service'
import { JdParseSchema, type JdParseResult } from '../../llm/schemas/jd.schema'
import { JD_PARSER_SYSTEM, buildJdParseUserPrompt } from '../../llm/prompts/jd-parser'
import { desensitize } from '../../security/desensitize.util'
import { extractJson } from '../../llm/json.util'

@Injectable()
export class JdService {
  private readonly logger = new Logger(JdService.name)

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
  ) {}

  /**
   * 解析 JD 文本
   */
  async parse(text: string, title?: string) {
    const safeText = desensitize(text)
    const start = Date.now()

    const raw = await this.llm.chat({
      messages: [
        { role: 'system', content: JD_PARSER_SYSTEM },
        { role: 'user', content: buildJdParseUserPrompt(safeText) },
      ],
      temperature: 0.3,
      jsonMode: true,
    })

    let parsed: JdParseResult
    try {
      const obj = extractJson<any>(raw)
      parsed = JdParseSchema.parse(obj)
    } catch (e: any) {
      this.logger.error(`JD 解析失败: ${e.message}`)
      this.logger.error(`=== LLM 原始输出 ===\n${raw}\n=== END ===`)

      // Fallback：尝试用宽松解析保留尽量多的内容
      try {
        const obj = extractJson<any>(raw)
        const skillsArr = Array.isArray(obj?.skills) ? obj.skills : []
        const focusArr = Array.isArray(obj?.focusAreas) ? obj.focusAreas : []
        if (skillsArr.length === 0) throw new Error('无法挽救：skills 为空')

        // 强行 sanitize 每个 skill
        const safeSkills = skillsArr
          .filter((s: any) => s && (s.name || s.技能))
          .map((s: any) => ({
            name: String(s.name || s.技能 || '未知技能'),
            category: ['basic', 'project', 'system', 'soft'].includes(s.category) ? s.category : 'basic',
            weight: Math.min(5, Math.max(1, Number(s.weight) || 3)),
            keywords: Array.isArray(s.keywords) ? s.keywords.map(String) : [],
          }))

        parsed = {
          title: obj?.title || '解析岗位',
          skills: safeSkills,
          focusAreas: focusArr,
          experience: obj?.experience,
        } as JdParseResult
        this.logger.warn(`⚠️ 使用 Fallback 解析，共保留 ${safeSkills.length} 个技能`)
      } catch (fbErr: any) {
        throw new Error(`LLM 输出无法解析: ${fbErr.message?.slice(0, 200)}`)
      }
    }

    // 入库
    const jd = await this.prisma.jobDescription.create({
      data: {
        title: title || parsed.title,
        rawText: safeText,
        skills: JSON.stringify(parsed.skills),
        focusAreas: JSON.stringify(parsed.focusAreas),
      },
    })

    this.logger.log(`JD 解析完成 id=${jd.id} 耗时=${Date.now() - start}ms`)

    return {
      id: jd.id,
      ...parsed,
    }
  }

  async findById(id: string) {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } })
    if (!jd) throw new NotFoundException(`JD ${id} 不存在`)
    return {
      id: jd.id,
      title: jd.title,
      skills: JSON.parse(jd.skills),
      focusAreas: JSON.parse(jd.focusAreas),
      createdAt: jd.parsedAt,
    }
  }

  async list() {
    return this.prisma.jobDescription.findMany({
      orderBy: { parsedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, parsedAt: true },
    })
  }
}
