const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const s = await p.interviewSession.findUnique({
    where: { id: 'cmqhun3k6001dwb40bux6wj1p' },
    include: { messages: { orderBy: { createdAt: 'asc' } }, report: true },
  })
  if (!s) { console.log('NOT FOUND'); return }
  console.log('Total msgs:', s.messages.length)
  console.log('Status:', s.status)
  console.log('Has report:', !!s.report)
  if (s.report) {
    console.log('Report summary:', (s.report.summary || '').slice(0, 200))
  }
  console.log('--- Messages ---')
  s.messages.forEach((m, i) => {
    let m2 = {}
    try { m2 = JSON.parse(m.meta || '{}') } catch {}
    const hasQIdx = typeof m2.questionIndex === 'number'
    const hasEval = m2.evaluation ? 'E' : '-'
    console.log(
      `[${i}] ${m.role.padEnd(11)} qIdx=${hasQIdx ? m2.questionIndex : 'X'} depth=${m2.depth ?? '-'} eval=${hasEval} content="${m.content.slice(0, 80)}"`,
    )
  })
  await p.$disconnect()
})()
