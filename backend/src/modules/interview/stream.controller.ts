import { Controller, Get, Param, Query, Sse, MessageEvent } from '@nestjs/common'
import { Observable, from, of, concat } from 'rxjs'
import { map, catchError } from 'rxjs/operators'
import { InterviewService } from './interview.service'
import { LlmService } from '../../llm/llm.service'

/**
 * SSE 流式追问端点
 * GET /api/interview/:sessionId/stream?answer=xxx
 *
 * 事件类型：
 *  - status: 状态变化（evaluating / asking / ended）
 *  - delta: 问题字符流（多次推送）
 *  - complete: 完整结果（含 evaluation / feedback / hint）
 *  - done: 结束
 */
@Controller('interview')
export class StreamController {
  constructor(
    private interview: InterviewService,
    private llm: LlmService,
  ) {}

  @Get(':sessionId/stream')
  @Sse()
  chatStream(
    @Param('sessionId') sessionId: string,
    @Query('answer') answer: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      ;(async () => {
        try {
          // 1. 状态：评估中
          subscriber.next({
            data: { type: 'evaluating' },
            type: 'status',
          } as any)

          // 2. 调用 chat() 走完整流程
          // 防御：如果 answer 是空字符串，传入一个占位文本（Prisma 要求非空）
          const safeAnswer = (answer || '').trim() || '(用户跳过本题)'
          const result = await this.interview.chat({ sessionId, answer: safeAnswer })

          // 3. 状态：出题中
          subscriber.next({
            data: { type: 'asking' },
            type: 'status',
          } as any)

          if (result.status === 'ended') {
            // 结束
            subscriber.next({
              data: {
                type: 'end',
                evaluation: result.evaluation,
                feedback: result.feedback,
              },
              type: 'complete',
            } as any)
          } else {
            // 流式推送下一题（按字符分块）
            const fullText = result.nextQuestion || ''
            const chunks = this.splitIntoChunks(fullText, 3) // 每块 2-3 字符

            for (const chunk of chunks) {
              subscriber.next({
                data: { text: chunk },
                type: 'delta',
              } as any)
              // 模拟打字节奏：每个块 20-50ms
              await this.sleep(20 + Math.random() * 30)
            }

            // 完整结果
            subscriber.next({
              data: {
                type: 'question',
                question: fullText,
                skill: result.currentSkill,
                questionType: result.currentType,
                difficulty: result.currentDifficulty,
                depth: result.currentDepth,
                hint: result.hint,
                progress: result.progress,
                evaluation: result.evaluation,
                feedback: result.feedback,
              },
              type: 'complete',
            } as any)
          }
        } catch (e: any) {
          subscriber.next({
            data: { type: 'error', message: e.message },
            type: 'error',
          } as any)
        } finally {
          subscriber.next({ data: '[DONE]', type: 'done' } as any)
          subscriber.complete()
        }
      })()
    })
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize))
    }
    return chunks
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }
}
