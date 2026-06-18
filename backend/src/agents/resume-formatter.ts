/**
 * 把结构化简历格式化成"可读文本"
 * 用于塞进 LLM Prompt
 */
import type { StructuredResume } from '../llm/schemas/resume.schema'

/**
 * 结构化简历 → Prompt 友好的文本
 */
export function formatStructuredResumeForPrompt(r: StructuredResume): string {
  const lines: string[] = []

  // 候选人
  if (r.candidate) {
    const c = r.candidate
    const parts: string[] = []
    if (c.yearsOfExperience) parts.push(`${c.yearsOfExperience}年经验`)
    if (c.currentRole) parts.push(`现任 ${c.currentRole}`)
    if (c.education) parts.push(c.education)
    if (parts.length) lines.push(`【候选人】${parts.join('，')}`)
  }

  // 技能
  if (r.skills?.length) {
    const top = r.skills
      .slice(0, 10)
      .map((s) => {
        const profMap = { beginner: '入门', intermediate: '熟练', advanced: '精通', expert: '专家' }
        return `${s.name}(${profMap[s.proficiency] || s.proficiency}${s.yearsUsed ? `/${s.yearsUsed}年` : ''})`
      })
      .join('、')
    lines.push(`【技能】${top}`)
  }

  // 项目（重点！这是结合简历出题的核心）
  if (r.projects?.length) {
    lines.push(`【项目经历】`)
    r.projects.slice(0, 3).forEach((p, i) => {
      lines.push(`${i + 1}. **${p.name}**${p.role ? ` (${p.role})` : ''}${p.duration ? ` [${p.duration}]` : ''}`)
      if (p.techStack?.length) {
        lines.push(`   技术栈: ${p.techStack.join('、')}`)
      }
      if (p.highlights?.length) {
        p.highlights.slice(0, 3).forEach((h) => {
          lines.push(`   • ${h}`)
        })
      }
      if (p.keyMetrics?.length) {
        p.keyMetrics.forEach((m) => {
          lines.push(`   📊 ${m}`)
        })
      }
    })
  }

  // 整体亮点
  if (r.highlights?.length) {
    lines.push(`【整体亮点】${r.highlights.join('；')}`)
  }

  return lines.join('\n')
}
