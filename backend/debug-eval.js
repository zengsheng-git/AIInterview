const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const s = await p.interviewSession.findFirst({
    where: { status: 'completed' },
    orderBy: { startedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!s) {
    console.log('no completed session')
    return
  }
  console.log('Session:', s.id)
  s.messages.forEach((m, i) => {
    let m2 = {}
    try { m2 = JSON.parse(m.meta || '{}') } catch {}
    const hasEval = m2.evaluation ? 'HAS_EVAL' : 'NO_EVAL'
    console.log(`[${i}] ${m.role} qIdx=${m2.questionIndex ?? '-'} ${hasEval} content="${m.content.slice(0, 60).replace(/\n/g, ' ')}"`)
    if (m2.evaluation) {
      console.log('   eval:', JSON.stringify(m2.evaluation))
    }
  })
  await p.$disconnect()
})()
