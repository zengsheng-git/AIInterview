const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const s = await p.interviewSession.findUnique({
    where: { id: 'cmqhvsd1l0001kqgvi32yovky' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  s.messages.forEach((m, i) => {
    let m2 = {}
    try { m2 = JSON.parse(m.meta || '{}') } catch {}
    const qi = typeof m2.questionIndex === 'number' ? m2.questionIndex : 'X'
    const ev = m2.evaluation ? 'E' : '-'
    console.log(`[${i}] ${m.role.slice(0,11)} qi=${qi} ev=${ev} meta=${JSON.stringify(m2).slice(0, 120)}`)
  })
  await p.$disconnect()
})()
