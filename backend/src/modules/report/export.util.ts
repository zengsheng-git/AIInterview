/**
 * 报告导出工具
 * - Markdown 格式（人读）
 */

export interface QaItem {
  index: number
  question: string
  answer: string
  referenceAnswer?: string
  skill: string
  type?: string
  difficulty?: number
  depth: number
  evaluation?: {
    depthScore: number
    clarity: number
    accuracy: number
  }
  feedback?: string
}

export interface ReportContext {
  jdTitle: string
  date: string
  totalQuestions: number
  radar: {
    basic: number
    project: number
    systemDesign: number
    communication: number
  }
  overallScore: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  suggestions: Array<{ area: string; action: string; priority: string }>
  qaList: QaItem[]
}

const TYPE_LABEL: Record<string, string> = {
  basic: '基础题',
  project: '项目题',
  system: '系统设计',
  scenario: '场景题',
}

const PRIORITY_LABEL: Record<string, string> = {
  high: '🔴 高',
  medium: '🟡 中',
  low: '🟢 低',
}

/**
 * 生成 Markdown 报告
 */
export function generateMarkdownReport(ctx: ReportContext): string {
  const lines: string[] = []

  // 标题
  lines.push(`# 📊 模拟面试报告`)
  lines.push('')
  lines.push(`> **岗位**：${ctx.jdTitle}`)
  lines.push(`> **日期**：${ctx.date}`)
  lines.push(`> **题数**：${ctx.totalQuestions} 道`)
  lines.push('')

  // 综合评分
  lines.push(`## 🎯 综合评分`)
  lines.push('')
  lines.push(`| 维度 | 分数 |`)
  lines.push(`| --- | --- |`)
  lines.push(`| **总分** | **${ctx.overallScore}** |`)
  lines.push(`| 基础知识 | ${ctx.radar.basic} |`)
  lines.push(`| 项目经验 | ${ctx.radar.project} |`)
  lines.push(`| 系统设计 | ${ctx.radar.systemDesign} |`)
  lines.push(`| 沟通表达 | ${ctx.radar.communication} |`)
  lines.push('')

  // 整体评价
  lines.push(`## 📝 整体评价`)
  lines.push('')
  lines.push(ctx.summary)
  lines.push('')

  // 亮点
  if (ctx.strengths.length) {
    lines.push(`## ✨ 亮点`)
    ctx.strengths.forEach((s) => lines.push(`- ${s}`))
    lines.push('')
  }

  // 不足
  if (ctx.weaknesses.length) {
    lines.push(`## ⚠️ 不足`)
    ctx.weaknesses.forEach((w) => lines.push(`- ${w}`))
    lines.push('')
  }

  // 改进建议
  if (ctx.suggestions.length) {
    lines.push(`## 💡 改进建议`)
    lines.push('')
    lines.push(`| 优先级 | 方向 | 具体行动 |`)
    lines.push(`| --- | --- | --- |`)
    ctx.suggestions.forEach((s) => {
      lines.push(`| ${PRIORITY_LABEL[s.priority] || s.priority} | ${s.area} | ${s.action} |`)
    })
    lines.push('')
  }

  // 分隔
  lines.push('---')
  lines.push('')
  lines.push(`## 📋 逐题详情`)
  lines.push('')

  // 每题
  ctx.qaList.forEach((qa) => {
    const typeLabel = TYPE_LABEL[qa.type || 'basic'] || '基础题'
    const difficulty = qa.difficulty || 2
    const score = qa.evaluation
      ? `深度 ${qa.evaluation.depthScore} / 清晰 ${qa.evaluation.clarity} / 准确 ${qa.evaluation.accuracy}`
      : '未评分'

    lines.push(`### 题目 ${qa.index}  [${qa.skill} · ${typeLabel} · 难度 ${'⭐'.repeat(difficulty)}]`)
    lines.push('')
    lines.push(`**问题**：${qa.question}`)
    lines.push('')
    lines.push(`<details>`)
    lines.push(`<summary><b>候选人回答</b></summary>`)
    lines.push('')
    lines.push(qa.answer || '_（未作答）_')
    lines.push('')
    lines.push(`</details>`)
    lines.push('')
    lines.push(`<details open>`)
    lines.push(`<summary><b>📖 参考答案</b></summary>`)
    lines.push('')
    lines.push(qa.referenceAnswer || '_参考答案生成中..._')
    lines.push('')
    lines.push(`</details>`)
    lines.push('')
    lines.push(`**得分**：${score}`)
    if (qa.feedback) {
      lines.push(`**反馈**：${qa.feedback}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  return lines.join('\n')
}
