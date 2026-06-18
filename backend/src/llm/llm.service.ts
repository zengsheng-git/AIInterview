import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

/**
 * MiniMax LLM 客户端封装
 * 兼容 OpenAI 协议: https://api.minimaxi.com/v1
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name)
  private client: OpenAI
  private defaultModel: string
  private reasoningModel: string

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('MINIMAX_API_KEY')
    const baseURL = this.config.get<string>('MINIMAX_BASE_URL')

    if (!apiKey) {
      this.logger.warn('⚠️ MINIMAX_API_KEY 未配置，LLM 调用将会失败')
    }

    this.client = new OpenAI({
      apiKey: apiKey || 'sk-placeholder',
      baseURL: baseURL || 'https://api.minimaxi.com/v1',
    })

    this.defaultModel = this.config.get<string>('MINIMAX_MODEL') || 'MiniMax-Text-01'
    this.reasoningModel = this.config.get<string>('MINIMAX_REASONING_MODEL') || 'MiniMax-Reasoning-01'
  }

  /**
   * 通用聊天（普通模型）
   */
  async chat(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature?: number
    maxTokens?: number
    jsonMode?: boolean
  }): Promise<string> {
    const start = Date.now()
    try {
      // ⚠️ MiniMax 兼容层不支持 response_format: json_object，
      // 改用 Prompt 注入 "请只输出 JSON" 来强制 JSON 输出
      const messages = params.jsonMode
        ? params.messages.map((m, i) =>
            i === 0
              ? { ...m, content: m.content + '\n\n【强制要求】请只输出合法的 JSON，不要包含任何 Markdown 标记、代码块或解释文字。' }
              : m,
          )
        : params.messages

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
      })
      const content = response.choices[0]?.message?.content || ''
      this.logger.debug(`LLM 调用耗时 ${Date.now() - start}ms, tokens: ${response.usage?.total_tokens}`)
      return content
    } catch (e: any) {
      this.logger.error(`LLM 调用失败: ${e.message}`)
      throw new Error(this.translateError(e))
    }
  }

  /**
   * 推理模型（用于追问决策、评分等需要强推理的场景）
   */
  async reason(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature?: number
    maxTokens?: number
  }): Promise<string> {
    const start = Date.now()
    try {
      const response = await this.client.chat.completions.create({
        model: this.reasoningModel,
        messages: params.messages,
        temperature: params.temperature ?? 0.5,
        max_tokens: params.maxTokens ?? 4096,
      })
      const content = response.choices[0]?.message?.content || ''
      this.logger.debug(`Reasoning LLM 调用耗时 ${Date.now() - start}ms`)
      return content
    } catch (e: any) {
      this.logger.error(`Reasoning LLM 调用失败: ${e.message}`)
      throw new Error(this.translateError(e))
    }
  }

  /**
   * 把 OpenAI 错误翻译成中文友好提示
   */
  private translateError(e: any): string {
    const status = e?.status
    const msg = e?.message || ''

    if (status === 401 || msg.includes('401') || msg.includes('login fail')) {
      return '❌ MiniMax 鉴权失败：API Key 无效或过期。请检查 backend/.env 中的 MINIMAX_API_KEY 是否为真实可用的 Key。'
    }
    if (status === 403) {
      return '❌ MiniMax 权限不足：当前 Key 没有该模型的访问权限。'
    }
    if (status === 404 || msg.includes('model')) {
      return `❌ MiniMax 模型不存在：${this.defaultModel} / ${this.reasoningModel}。请检查 backend/.env 中的 MINIMAX_MODEL 配置。`
    }
    if (status === 429) {
      return '❌ MiniMax 触发限流：请求过于频繁或余额不足。'
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      return `❌ 无法连接 MiniMax 服务（${msg}）。请检查网络或 MINIMAX_BASE_URL 配置。`
    }
    if (status >= 500) {
      return `❌ MiniMax 服务异常（${status}）：${msg}`
    }
    return `❌ LLM 调用失败：${msg}`
  }

  /**
   * 流式输出（SSE 用）
   */
  async *stream(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature?: number
    maxTokens?: number
  }): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.defaultModel,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048,
      stream: true,
    })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  get modelName() {
    return this.defaultModel
  }
  get reasoningModelName() {
    return this.reasoningModel
  }
}
