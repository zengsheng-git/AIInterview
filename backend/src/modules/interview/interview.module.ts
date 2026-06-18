import { Module } from '@nestjs/common'
import { InterviewController } from './interview.controller'
import { StreamController } from './stream.controller'
import { InterviewService } from './interview.service'

@Module({
  controllers: [InterviewController, StreamController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class InterviewModule {}
