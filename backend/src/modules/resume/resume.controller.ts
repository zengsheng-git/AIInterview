import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ResumeService } from './resume.service'

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  /**
   * 上传简历文件
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传文件')
    return this.resumeService.upload(file)
  }

  /**
   * 直接粘贴简历文本
   */
  @Post('text')
  async uploadText(@Body() body: { filename: string; text: string }) {
    if (!body.text) throw new BadRequestException('请提供简历文本')
    return this.resumeService.uploadText(body.filename || 'manual.txt', body.text)
  }

  /**
   * 简历-JD 匹配分析
   */
  @Post('match')
  async match(@Body() body: { resumeId: string; jdId: string }) {
    return this.resumeService.matchWithJd(body.resumeId, body.jdId)
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.resumeService.findById(id)
  }
}
