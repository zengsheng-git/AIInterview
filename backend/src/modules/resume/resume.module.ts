import { Module } from '@nestjs/common'
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'
import { PdfParser } from '../../parsers/pdf.parser'
import { DocxParser } from '../../parsers/docx.parser'

@Module({
  controllers: [ResumeController],
  providers: [ResumeService, PdfParser, DocxParser],
  exports: [ResumeService],
})
export class ResumeModule {}
