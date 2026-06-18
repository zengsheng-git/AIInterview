import { Module } from '@nestjs/common'
import { ReportController } from './report.controller'
import { ReportService } from './report.service'
import { InterviewModule } from '../interview/interview.module'

@Module({
  imports: [InterviewModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
