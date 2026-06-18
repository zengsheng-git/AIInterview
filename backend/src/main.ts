import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  })

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )

  // 全局异常过滤器（把真实错误带回去）
  app.useGlobalFilters(new AllExceptionsFilter())

  // 全局 API 前缀
  app.setGlobalPrefix('api')

  const port = process.env.PORT || 3001
  await app.listen(port)

  const logger = new Logger('Bootstrap')
  logger.log(`🚀 后端服务已启动: http://localhost:${port}/api`)
}

bootstrap()
