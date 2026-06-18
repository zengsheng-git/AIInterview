import { Injectable } from '@nestjs/common'
// @ts-ignore - pdf-parse 没有官方类型
import pdfParse from 'pdf-parse'

@Injectable()
export class PdfParser {
  async extractText(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer)
    return data.text
  }
}
