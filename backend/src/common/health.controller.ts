import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LlmService } from '../llm/llm.service'

@Controller('health')
export class HealthController {
  constructor(
    private llm: LlmService,
    private config: ConfigService,
  ) {}

  @Get()
  health() {
    const apiKey = this.config.get<string>('MINIMAX_API_KEY') || ''
    const isPlaceholder = !apiKey || apiKey.includes('xxxx') || apiKey === 'sk-placeholder'

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      llm: {
        model: this.llm.modelName,
        reasoningModel: this.llm.reasoningModelName,
        baseURL: this.config.get<string>('MINIMAX_BASE_URL'),
        apiKeyConfigured: apiKey.length > 0,
        apiKeyLooksValid: !isPlaceholder,
        apiKeyPrefix: apiKey ? apiKey.slice(0, 6) + '...' : '(empty)',
        warning: isPlaceholder
          ? '⚠️ MINIMAX_API_KEY 是占位符，请到 backend/.env 配置真实 Key，否则 LLM 调用会 401'
          : undefined,
      },
    }
  }
}
