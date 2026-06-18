import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
  Packer,
  LevelFormat,
  convertInchesToTwip,
} from 'docx'
import type { ReportContext, QaItem } from './export.util'

/**
 * 把 ReportContext 渲染成 Word 文档（Buffer）
 * 复用 export.util.ts 的 ReportContext 数据结构
 */
export async function generateWordReport(ctx: ReportContext): Promise<Buffer> {
  const doc = new Document({
    creator: 'AI Mock Interview',
    title: `面试报告 - ${ctx.jdTitle}`,
    description: 'AI 模拟面试评估报告',
    styles: {
      default: {
        document: {
          run: {
            font: 'Microsoft YaHei',
            size: 22, // 11pt = 22 半磅
          },
        },
        heading1: {
          run: {
            font: 'Microsoft YaHei',
            size: 36, // 18pt
            bold: true,
            color: '1e293b',
          },
          paragraph: {
            spacing: { before: 360, after: 240 },
          },
        },
        heading2: {
          run: {
            font: 'Microsoft YaHei',
            size: 28, // 14pt
            bold: true,
            color: '4f46e5',
          },
          paragraph: {
            spacing: { before: 280, after: 160 },
          },
        },
        heading3: {
          run: {
            font: 'Microsoft YaHei',
            size: 24, // 12pt
            bold: true,
            color: '334155',
          },
          paragraph: {
            spacing: { before: 200, after: 120 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9),
              bottom: convertInchesToTwip(0.9),
              left: convertInchesToTwip(0.9),
            },
          },
        },
        children: [
          ...buildCover(ctx),
          ...buildOverview(ctx),
          ...buildSummary(ctx),
          ...buildSuggestions(ctx),
          ...buildQuestionsList(ctx),
          ...buildFooter(ctx),
        ],
      },
    ],
  })

  return await Packer.toBuffer(doc)
}

// ============ 封面 ============
function buildCover(ctx: ReportContext): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 400 },
      children: [
        new TextRun({ text: 'AI 模拟面试报告', bold: true, size: 56, color: '4f46e5' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'AI Mock Interview Report', size: 24, color: '94a3b8' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 200 },
      children: [
        new TextRun({ text: `岗位：${ctx.jdTitle}`, bold: true, size: 32, color: '1e293b' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `日期：${ctx.date}`, size: 22, color: '64748b' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `题数：${ctx.totalQuestions} 道`, size: 22, color: '64748b' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 200 },
      children: [
        new TextRun({ text: '综合评分', size: 22, color: '64748b' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: String(ctx.overallScore), bold: true, size: 80, color: '4f46e5' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: getScoreLevel(ctx.overallScore),
          size: 24,
          color: getScoreColor(ctx.overallScore),
        }),
      ],
    }),
    new Paragraph({ children: [], pageBreakBefore: true }),
  ]
}

// ============ 综合评分（雷达图 + 表格） ============
function buildOverview(ctx: ReportContext): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '一、综合评分' })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '基于 AI 对候选人回答的深度、清晰度、准确度三个维度评估，得出四维能力雷达：', size: 22 }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } }),
  ]

  // ASCII 雷达图（用文本构造可视化，Word 里也清晰）
  elements.push(buildRadarAsciiTable(ctx.radar))
  elements.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } }))

  // 分数明细表格
  const scoreTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['维度', '分数', '等级'].map(
          (h) =>
            new TableCell({
              shading: { fill: '4f46e5', type: ShadingType.CLEAR, color: 'auto' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: h, bold: true, color: 'ffffff', size: 22 })],
                }),
              ],
            }),
        ),
      }),
      ...[
        ['基础知识', ctx.radar.basic],
        ['项目经验', ctx.radar.project],
        ['系统设计', ctx.radar.systemDesign],
        ['沟通表达', ctx.radar.communication],
      ].map(
        ([label, score]) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: String(label), size: 22 })] }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: String(score),
                        bold: true,
                        size: 28,
                        color: getScoreColor(Number(score)),
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: getScoreLevel(Number(score)),
                        size: 22,
                        color: getScoreColor(Number(score)),
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
      ),
    ],
  })

  elements.push(scoreTable)
  elements.push(new Paragraph({ children: [], spacing: { after: 400 } }))

  return elements
}

/**
 * 用 ASCII 字符构造雷达图（4 维），以表格形式呈现
 * 比 SVG 简单，Word 里直接可见
 */
function buildRadarAsciiTable(radar: ReportContext['radar']): Table {
  const dims = [
    { key: 'basic', label: '基础', value: radar.basic },
    { key: 'project', label: '项目', value: radar.project },
    { key: 'systemDesign', label: '系统', value: radar.systemDesign },
    { key: 'communication', label: '沟通', value: radar.communication },
  ]

  const cells: TableCell[] = []
  cells.push(
    new TableCell({
      shading: { fill: 'f1f5f9', type: ShadingType.CLEAR, color: 'auto' },
      children: [
        new Paragraph({
          children: [new TextRun({ text: '维度', bold: true, size: 22 })],
        }),
      ],
    }),
  )
  dims.forEach((d) =>
    cells.push(
      new TableCell({
        shading: { fill: 'f1f5f9', type: ShadingType.CLEAR, color: 'auto' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: d.label, bold: true, size: 22 })],
          }),
        ],
      }),
    ),
  )

  // 进度条行：用 █ 和 ░ 构造可视化条
  const barRow: TableCell[] = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: '能力条', size: 20 })] })],
    }),
  ]
  dims.forEach((d) => {
    const filled = Math.round((d.value / 100) * 20)
    const empty = 20 - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    barRow.push(
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: bar, font: 'Consolas', size: 18, color: getScoreColor(d.value) }),
            ],
          }),
        ],
      }),
    )
  })

  // 分值行
  const valueRow: TableCell[] = [
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: '分数', size: 20 })] })],
    }),
  ]
  dims.forEach((d) =>
    valueRow.push(
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: String(d.value),
                bold: true,
                size: 26,
                color: getScoreColor(d.value),
              }),
            ],
          }),
        ],
      }),
    ),
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'e2e8f0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'e2e8f0' },
    },
    rows: [
      new TableRow({ children: cells }),
      new TableRow({ children: barRow }),
      new TableRow({ children: valueRow }),
    ],
  })
}

// ============ 整体评价 ============
function buildSummary(ctx: ReportContext): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '二、整体评价' })],
    }),
    new Paragraph({
      children: [new TextRun({ text: ctx.summary || '暂无整体评价', size: 22 })],
      spacing: { after: 200 },
    }),
    ...(ctx.strengths?.length
      ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: '亮点' })],
          }),
          ...ctx.strengths.map(
            (s) =>
              new Paragraph({
                bullet: { level: 0 },
                children: [new TextRun({ text: s, size: 22 })],
              }),
          ),
        ]
      : []),
    ...(ctx.weaknesses?.length
      ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: '不足' })],
          }),
          ...ctx.weaknesses.map(
            (w) =>
              new Paragraph({
                bullet: { level: 0 },
                children: [new TextRun({ text: w, size: 22 })],
              }),
          ),
        ]
      : []),
    new Paragraph({ children: [], spacing: { after: 300 } }),
  ]
}

// ============ 改进建议 ============
function buildSuggestions(ctx: ReportContext): (Paragraph | Table)[] {
  if (!ctx.suggestions?.length) return []
  const PRIORITY_LABEL: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  }
  const PRIORITY_COLOR: Record<string, string> = {
    high: 'dc2626',
    medium: 'd97706',
    low: '2563eb',
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['优先级', '方向', '具体行动'].map(
          (h) =>
            new TableCell({
              shading: { fill: '4f46e5', type: ShadingType.CLEAR, color: 'auto' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: h, bold: true, color: 'ffffff', size: 22 })],
                }),
              ],
            }),
        ),
      }),
      ...ctx.suggestions.map(
        (s) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: PRIORITY_LABEL[s.priority] || s.priority,
                        bold: true,
                        size: 22,
                        color: PRIORITY_COLOR[s.priority] || '64748b',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: s.area, size: 22 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: s.action, size: 22 })] })],
              }),
            ],
          }),
      ),
    ],
  })

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '三、改进建议' })],
    }),
    table,
    new Paragraph({ children: [], spacing: { after: 300 } }),
  ]
}

// ============ 逐题详情 ============
function buildQuestionsList(ctx: ReportContext): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: '四、逐题详情' })],
    }),
    new Paragraph({ children: [], pageBreakBefore: false }),
  ]

  ctx.qaList.forEach((qa, idx) => {
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `题目 ${qa.index}　`,
            bold: true,
          }),
          new TextRun({
            text: `[${qa.skill} · ${getTypeLabel(qa.type)} · 难度 ${'★'.repeat(qa.difficulty || 2)}]`,
            size: 20,
            color: '64748b',
          }),
        ],
      }),
    )

    // 问题
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '问题' })],
      }),
      new Paragraph({
        children: [new TextRun({ text: qa.question, size: 22 })],
        spacing: { after: 200 },
      }),
    )

    // 候选人回答
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '候选人回答' })],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: qa.answer || '（未作答）',
            size: 22,
            italics: !qa.answer,
            color: qa.answer ? '1e293b' : '94a3b8',
          }),
        ],
        spacing: { after: 200 },
      }),
    )

    // 参考答案（Markdown → 多段落）
    if (qa.referenceAnswer) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: '参考答案', color: '059669' })],
        }),
        ...parseMarkdownToParagraphs(qa.referenceAnswer),
      )
    }

    // 得分 + 反馈
    if (qa.evaluation) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: '本题评分' })],
        }),
        buildScoreTable(qa.evaluation),
      )
    }
    if (qa.feedback) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: '反馈' })],
        }),
        new Paragraph({
          children: [new TextRun({ text: qa.feedback, size: 22, italics: true })],
          spacing: { after: 300 },
        }),
      )
    }

    // 题与题之间加分隔
    if (idx < ctx.qaList.length - 1) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ text: '─'.repeat(40), color: 'cbd5e1', size: 16 })],
        }),
      )
    }
  })

  return elements
}

function buildScoreTable(eva: NonNullable<QaItem['evaluation']>): Table {
  const items: Array<[string, number]> = [
    ['深度', eva.depthScore],
    ['清晰', eva.clarity],
    ['准确', eva.accuracy],
  ]
  return new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    rows: items.map(
      ([label, score]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22 })] }),
              ],
            }),
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: String(score),
                      bold: true,
                      size: 26,
                      color: getScoreColor(score),
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: getScoreLevel(score),
                      size: 20,
                      color: getScoreColor(score),
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
  })
}

// ============ 页脚 ============
function buildFooter(_ctx: ReportContext): Paragraph[] {
  return [
    new Paragraph({ children: [], spacing: { before: 600 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '— 本报告由 AI Mock Interview 智能生成 —',
          italics: true,
          color: '94a3b8',
          size: 20,
        }),
      ],
    }),
  ]
}

// ============ Markdown → docx Paragraph[] 转换器 ============

/**
 * 把参考答案的 Markdown 文本转成 docx 段落数组
 * 支持：## 标题、### 三级标题、- 列表、**加粗**、`代码`、普通段落
 */
function parseMarkdownToParagraphs(md: string): Paragraph[] {
  const lines = md.split('\n')
  const paragraphs: Paragraph[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    if (!line) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
      continue
    }

    // 三级标题
    if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: parseInline(line.slice(4)),
        }),
      )
      continue
    }

    // 二级标题
    if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: parseInline(line.slice(3)),
        }),
      )
      continue
    }

    // 列表项
    if (/^[-*]\s+/.test(line)) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseInline(line.replace(/^[-*]\s+/, '')),
        }),
      )
      continue
    }

    // 普通段落
    paragraphs.push(
      new Paragraph({
        children: parseInline(line),
      }),
    )
  }

  return paragraphs
}

/**
 * 解析行内 Markdown（**加粗**、`代码`）→ TextRun[]
 */
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = []
  // 同时支持 ** 和 `，用正则匹配
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  const parts = text.split(regex)

  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          font: 'Consolas',
          color: '4f46e5',
        }),
      )
    } else {
      runs.push(new TextRun({ text: part }))
    }
  }
  if (runs.length === 0) runs.push(new TextRun({ text: text }))
  return runs
}

// ============ 辅助函数 ============
function getScoreColor(score: number): string {
  if (score >= 80) return '059669' // 绿
  if (score >= 60) return '4f46e5' // 蓝
  if (score >= 40) return 'd97706' // 橙
  return 'dc2626' // 红
}

function getScoreLevel(score: number): string {
  if (score >= 90) return '优秀 ★★★'
  if (score >= 80) return '良好 ★★'
  if (score >= 60) return '合格 ★'
  if (score >= 40) return '薄弱'
  return '需努力'
}

function getTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    basic: '基础题',
    project: '项目题',
    system: '系统设计',
    scenario: '场景题',
  }
  return map[type || 'basic'] || '基础题'
}