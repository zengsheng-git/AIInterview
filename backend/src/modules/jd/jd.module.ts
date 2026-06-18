import { Module } from '@nestjs/common'
import { JdController } from './jd.controller'
import { JdService } from './jd.service'

@Module({
  controllers: [JdController],
  providers: [JdService],
  exports: [JdService],
})
export class JdModule {}
