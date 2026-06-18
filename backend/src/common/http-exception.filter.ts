import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'

/**
 * 全局异常过滤器：把内部错误信息暴露到 response，方便调试
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    let message = exception?.message || 'Internal server error'

    // 翻译 OpenAI / MiniMax 错误
    if (status === 500) {
      const original = exception?.response?.data?.error?.message || exception?.message || ''
      if (original.includes('401') || original.includes('login fail')) {
        message = '❌ MiniMax 鉴权失败：API Key 无效或过期。请检查 backend/.env 中的 MINIMAX_API_KEY。'
      } else if (original.includes('model')) {
        message = `❌ MiniMax 模型问题：${original}`
      } else if (original.includes('ECONNREFUSED') || original.includes('ENOTFOUND')) {
        message = `❌ 无法连接 MiniMax：${original}`
      } else if (original.includes('JSON') || original.includes('parse')) {
        message = `❌ LLM 返回格式异常：${original}`
      } else {
        message = `❌ ${original || exception?.message || 'Internal server error'}`
      }
    }

    this.logger.error(`[${request.method} ${request.url}] → ${status} ${message}`)
    if (status === 500) {
      this.logger.error(exception?.stack)
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    })
  }
}
