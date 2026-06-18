import { Controller, Get, Param, Res } from '@nestjs/common'
import { Response } from 'express'
import { ReportService } from './report.service'

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * 导出 Markdown 报告（含参考答案）
   */
  @Get(':sessionId/markdown')
  async exportMarkdown(
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
  ) {
    const { filename, content, mimeType } = await this.reportService.exportMarkdown(sessionId)
    res.setHeader('Content-Type', `${mimeType}; charset=utf-8`)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.send(content)
  }

  /**
   * 导出 Word 文档报告（含参考答案、专业排版）
   */
  @Get(':sessionId/word')
  async exportWord(
    @Param('sessionId') sessionId: string,
    @Res() res: Response,
  ) {
    const { filename, content, mimeType } = await this.reportService.exportWord(sessionId)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    )
    res.setHeader('Content-Length', String(content.length))
    res.end(content)
  }
}
