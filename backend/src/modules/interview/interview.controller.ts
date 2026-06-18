import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common'
import { Response } from 'express'
import { InterviewService } from './interview.service'

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  /**
   * 启动面试
   */
  @Post('start')
  async start(@Body() body: { jdId: string; resumeId?: string; mode: 'practice' | 'strict' }) {
    return this.interviewService.start(body)
  }

  /**
   * 提交回答 → 下一个问题
   */
  @Post('chat')
  async chat(@Body() body: { sessionId: string; answer: string }) {
    return this.interviewService.chat(body)
  }

  /**
   * 结束面试 + 生成报告
   */
  @Post('end')
  async end(@Body() body: { sessionId: string }) {
    return this.interviewService.end(body.sessionId)
  }

  /**
   * 获取报告
   */
  @Get(':sessionId/report')
  async getReport(@Param('sessionId') sessionId: string) {
    return this.interviewService.getReport(sessionId)
  }

  /**
   * 获取历史消息
   */
  @Get(':sessionId/messages')
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.interviewService.getMessages(sessionId)
  }

  /**
   * SSE 流式追问（打字机效果用）
   * 前端通过 EventSource + query 参数传 answer
   */
  @Get(':sessionId/stream')
  async stream(
    @Param('sessionId') sessionId: string,
    @Query('answer') answer: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    try {
      const result = await this.interviewService.chat({ sessionId, answer: answer || '' })

      const send = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }

      // 先推送评估结果
      send('status', { type: 'evaluating' })

      if (result.status === 'ended') {
        send('complete', {
          type: 'end',
          feedback: result.feedback,
          evaluation: result.evaluation,
        })
      } else {
        // 流式推送下一个问题（打字机）
        const text = result.nextQuestion || ''
        for (let i = 0; i < text.length; i += 2) {
          send('delta', { text: text.slice(i, i + 2) })
          await new Promise((r) => setTimeout(r, 30))
        }
        send('complete', {
          type: 'question',
          question: text,
          skill: result.currentSkill,
          questionType: result.currentType,
          difficulty: result.currentDifficulty,
          depth: result.currentDepth,
          hint: result.hint,
          progress: result.progress,
          evaluation: result.evaluation,
        })
      }

      send('done', {})
      res.end()
    } catch (e: any) {
      const errorSend = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }
      errorSend('error', { message: e.message || '流式连接出错' })
      res.end()
    }
  }
}
