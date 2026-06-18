import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * 删除一个面试会话（级联删除消息和报告）
   */
  async remove(sessionId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
    })
    if (!session) throw new NotFoundException(`Session ${sessionId} 不存在`)

    // ChatMessage 有 onDelete: Cascade，InterviewReport 也有 unique 关联
    await this.prisma.interviewSession.delete({ where: { id: sessionId } })
    this.logger.log(`🗑️ 删除 session: ${sessionId}`)
    return { ok: true, id: sessionId }
  }

  /**
   * 批量删除多个面试会话
   */
  async removeMany(sessionIds: string[]) {
    if (!sessionIds?.length) {
      throw new BadRequestException('请提供要删除的 sessionId 列表')
    }

    const result = await this.prisma.interviewSession.deleteMany({
      where: { id: { in: sessionIds } },
    })

    this.logger.log(`🗑️ 批量删除 ${result.count} 个 session`)
    return { ok: true, deletedCount: result.count }
  }

  /**
   * 列出所有面试会话（带报告概要）
   */
  async list(params: { keyword?: string; limit?: number; offset?: number }) {
    const { keyword, limit = 50, offset = 0 } = params

    // 取出 session + 关联的 jd
    const where: any = {}
    if (keyword) {
      where.jd = { title: { contains: keyword } }
    }

    const sessions = await this.prisma.interviewSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        jd: { select: { id: true, title: true } },
        report: { select: { scores: true, summary: true } },
        _count: { select: { messages: true } },
      },
    })

    return sessions.map((s) => {
      // 解析 report.scores JSON
      let radar: any = null
      let overallScore: number | null = null
      if (s.report?.scores) {
        try {
          radar = JSON.parse(s.report.scores)
          overallScore = Math.round(
            (radar.basic + radar.project + radar.systemDesign + radar.communication) / 4,
          )
        } catch (e) {
          this.logger.warn(`session ${s.id} 报告 scores 解析失败`)
        }
      }
      return {
        id: s.id,
        jdId: s.jdId,
        jdTitle: s.jd.title,
        mode: s.mode,
        status: s.status,
        messageCount: s._count.messages,
        radar,
        overallScore,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        duration: s.endedAt
          ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 1000)
          : null,
      }
    })
  }

  /**
   * 列出总数（用于分页）
   */
  async count(keyword?: string) {
    const where: any = {}
    if (keyword) where.jd = { title: { contains: keyword } }
    return this.prisma.interviewSession.count({ where })
  }

  /**
   * 获取单个会话的完整详情
   * - 报告
   * - Q&A 列表
   * - 每题 evaluation
   */
  async detail(sessionId: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        jd: true,
        report: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!session) throw new NotFoundException(`Session ${sessionId} 不存在`)

    // 拼装 Q&A
    const qaList: Array<{
      index: number
      question: string
      answer: string
      skill: string
      type: string
      difficulty: number
      depth: number
      evaluation?: any
      feedback?: string
    }> = []

    // ⭐ 最简算法：按 candidate 消息 meta 中的 questionIndex 严格配对
    const interviewersByIdx = new Map<number, any>()
    for (const m of session.messages) {
      if (m.role !== 'interviewer') continue
      let qMeta: any = {}
      try { qMeta = JSON.parse(m.meta || '{}') } catch {}
      const idx = qMeta.questionIndex
      const depth = qMeta.depth ?? 0
      if (typeof idx === 'number' && idx >= 0 && depth === 0) {
        if (!interviewersByIdx.has(idx)) {
          interviewersByIdx.set(idx, m)
        }
      }
    }

    const candidatesByIdx = new Map<number, any>()
    for (const m of session.messages) {
      if (m.role !== 'candidate') continue
      let aMeta: any = {}
      try { aMeta = JSON.parse(m.meta || '{}') } catch {}
      const idx = aMeta.questionIndex
      if (typeof idx === 'number' && idx >= 0 && !candidatesByIdx.has(idx)) {
        candidatesByIdx.set(idx, m)
      }
    }

    const sortedIdxs = Array.from(interviewersByIdx.keys()).sort((a, b) => a - b)

    for (const idx of sortedIdxs) {
      const q = interviewersByIdx.get(idx)
      const candidate = candidatesByIdx.get(idx)
      const qMeta = JSON.parse(q.meta || '{}')
      const aMeta = candidate ? JSON.parse(candidate.meta || '{}') : {}
      qaList.push({
        index: qaList.length + 1,
        question: q.content,
        answer: candidate?.content || '(用户跳过本题)',
        skill: qMeta.skill || '通用',
        type: qMeta.type || 'basic',
        difficulty: qMeta.difficulty || 2,
        depth: qMeta.depth || 0,
        evaluation: aMeta.evaluation || undefined,
        feedback: aMeta.feedback || qMeta.feedback,
      })
    }

    return {
      id: session.id,
      jd: {
        id: session.jd.id,
        title: session.jd.title,
        skills: JSON.parse(session.jd.skills),
        focusAreas: JSON.parse(session.jd.focusAreas),
      },
      mode: session.mode,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      config: JSON.parse(session.config),
      report: session.report
        ? {
            radar: JSON.parse(session.report.scores),
            summary: session.report.summary,
            suggestions: JSON.parse(session.report.suggestions),
            createdAt: session.report.createdAt,
          }
        : null,
      qaList,
    }
  }
}
