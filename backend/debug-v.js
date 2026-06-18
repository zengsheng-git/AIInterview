const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const s = await p.interviewSession.findUnique({
    where: { id: 'cmqhsjx03001oymj0ae2z98ct' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  console.log('Total msgs:', s.messages.length)
  s.messages.forEach((m, i) => {
    let m2 = {}
    try { m2 = JSON.parse(m.meta || '{}') } catch {}
    console.log(
      `[${i}] ${m.role.padEnd(11)} qIdx=${String(m2.questionIndex ?? '-').padEnd(3)} depth=${m2.depth ?? '-'} content="${m.content.slice(0, 60).replace(/\n/g, ' ')}"`,
    )
  })
  await p.$disconnect()
})()
