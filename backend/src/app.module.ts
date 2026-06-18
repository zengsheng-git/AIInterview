import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LlmModule } from './llm/llm.module'
import { PrismaModule } from './prisma/prisma.module'
import { JdModule } from './modules/jd/jd.module'
import { ResumeModule } from './modules/resume/resume.module'
import { InterviewModule } from './modules/interview/interview.module'
import { ReportModule } from './modules/report/report.module'
import { HistoryModule } from './modules/history/history.module'
import { HealthController } from './common/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    LlmModule,
    JdModule,
    ResumeModule,
    InterviewModule,
    ReportModule,
    HistoryModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
