import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { HistoryService } from './history.service'

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /**
   * 列出所有面试会话
   */
  @Get()
  async list(
    @Query('keyword') keyword?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const items = await this.historyService.list({
      keyword,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })
    const total = await this.historyService.count(keyword)
    return { total, items }
  }

  /**
   * 批量删除多个面试会话
   */
  @Post('batch-delete')
  async removeMany(@Body() body: { ids: string[] }) {
    return this.historyService.removeMany(body?.ids || [])
  }

  /**
   * 单个会话完整详情
   */
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.historyService.detail(id)
  }

  /**
   * 删除一个面试会话
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.historyService.remove(id)
  }
}
