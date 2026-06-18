import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { JdService } from './jd.service'

@Controller('jd')
export class JdController {
  constructor(private readonly jdService: JdService) {}

  /**
   * 解析 JD
   */
  @Post('parse')
  async parse(@Body() body: { text: string; title?: string }) {
    return this.jdService.parse(body.text, body.title)
  }

  /**
   * 获取 JD 详情
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.jdService.findById(id)
  }

  /**
   * 列出所有 JD
   */
  @Get()
  async list() {
    return this.jdService.list()
  }
}
