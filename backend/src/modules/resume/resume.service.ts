import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { LlmService } from '../../llm/llm.service'
import { PdfParser } from '../../parsers/pdf.parser'
import { DocxParser } from '../../parsers/docx.parser'
import {
  ResumeMatchSchema,
  type ResumeMatchResult,
} from '../../llm/schemas/resume.schema'
import { RESUME_MATCHER_SYSTEM, buildResumeMatchUserPrompt } from '../../llm/prompts/resume-matcher'
import { desensitize } from '../../security/desensitize.util'
import { extractJson } from '../../llm/json.util'

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name)

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private pdfParser: PdfParser,
    private docxParser: DocxParser,
  ) {}

  async upload(file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop()?.toLowerCase()
    let rawText = ''

    if (ext === 'pdf') {
      rawText = await this.pdfParser.extractText(file.buffer)
    } else if (ext === 'docx') {
      rawText = await this.docxParser.extractText(file.buffer)
    } else if (ext === 'txt' || ext === 'md') {
      rawText = file.buffer.toString('utf-8')
    } else {
      throw new Error('不支持的文件类型，请上传 PDF / DOCX / TXT')
    }

    return this.uploadText(file.originalname, rawText)
  }

  async uploadText(filename: string, text: string) {
    const safeText = desensitize(text)
    const resume = await this.prisma.resume.create({
      data: {
        filename,
        rawText: safeText,
        meta: JSON.stringify({ length: safeText.length }),
      },
    })
    this.logger.log(`简历入库 id=${resume.id} filename=${filename} 长度=${safeText.length}`)
    return {
      id: resume.id,
      filename: resume.filename,
      length: safeText.length,
      preview: safeText.slice(0, 500),
    }
  }

  async findById(id: string) {
    const r = await this.prisma.resume.findUnique({ where: { id } })
    if (!r) throw new NotFoundException(`简历 ${id} 不存在`)
    return { id: r.id, filename: r.filename, rawText: r.rawText, uploadedAt: r.uploadedAt }
  }

  /**
   * 简历与 JD 匹配
   */
  async matchWithJd(resumeId: string, jdId: string): Promise<ResumeMatchResult> {
    const [resume, jd] = await Promise.all([
      this.prisma.resume.findUnique({ where: { id: resumeId } }),
      this.prisma.jobDescription.findUnique({ where: { id: jdId } }),
    ])
    if (!resume) throw new NotFoundException(`简历 ${resumeId} 不存在`)
    if (!jd) throw new NotFoundException(`JD ${jdId} 不存在`)

    const skills = JSON.parse(jd.skills) as any[]
    const jdSkillsText = skills
      .map((s) => `- ${s.name} (权重 ${s.weight}, 类别 ${s.category})`)
      .join('\n')

    const start = Date.now()
    const raw = await this.llm.chat({
      messages: [
        { role: 'system', content: RESUME_MATCHER_SYSTEM },
        {
          role: 'user',
          content: buildResumeMatchUserPrompt(resume.rawText, jdSkillsText),
        },
      ],
      temperature: 0.3,
      jsonMode: true,
    })

    let result: ResumeMatchResult
    try {
      const obj = extractJson<any>(raw)
      result = ResumeMatchSchema.parse(obj)
    } catch (e: any) {
      this.logger.error(`简历匹配解析失败: ${e.message}`)
      this.logger.error(`=== LLM 原始输出 ===\n${raw}\n=== END ===`)

      // Fallback：尝试挽救出可用的部分
      try {
        const obj = extractJson<any>(raw)
        const matched = Array.isArray(obj?.matchedSkills) ? obj.matchedSkills : []
        const missing = Array.isArray(obj?.missingSkills) ? obj.missingSkills : []
        const highlights = Array.isArray(obj?.highlights) ? obj.highlights : []
        const gaps = Array.isArray(obj?.gaps) ? obj.gaps : []
        const predicted = Array.isArray(obj?.predictedQuestions) ? obj.predictedQuestions : []

        const safePredicted = predicted
          .filter((q: any) => q && (q.question || q.问题))
          .map((q: any) => ({
            question: String(q.question || q.问题 || ''),
            reason: String(q.reason || q.原因 || '简历与 JD 差异引发'),
            category: ['basic', 'project', 'system', 'pressure'].includes(q.category) ? q.category : 'project',
          }))

        result = {
          overallScore: Math.min(100, Math.max(0, Number(obj?.overallScore) || 50)),
          dimensionScores: {
            skills: Math.min(100, Math.max(0, Number(obj?.dimensionScores?.skills) || 50)),
            experience: Math.min(100, Math.max(0, Number(obj?.dimensionScores?.experience) || 50)),
            projects: Math.min(100, Math.max(0, Number(obj?.dimensionScores?.projects) || 50)),
          },
          matchedSkills: matched.map(String),
          missingSkills: missing.map(String),
          highlights: highlights.map(String),
          gaps: gaps.map(String),
          predictedQuestions: safePredicted,
        }
        this.logger.warn(`⚠️ 使用 Fallback 解析简历匹配`)
      } catch (fbErr: any) {
        throw new Error(`简历匹配输出无法解析: ${fbErr.message?.slice(0, 200)}`)
      }
    }

    this.logger.log(`简历匹配完成 耗时=${Date.now() - start}ms score=${result.overallScore}`)
    return result
  }
}
