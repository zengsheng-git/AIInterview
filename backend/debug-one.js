const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const s = await p.interviewSession.findUnique({
    where: { id: 'cmqhq950r0001rhzzhedm2sm2' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  console.log('Total msgs:', s.messages.length)
  s.messages.forEach((m, i) => {
    const m2 = JSON.parse(m.meta || '{}')
    console.log(
      `[${i}] ${m.role.padEnd(11)} qIdx=${String(m2.questionIndex ?? '-').padEnd(3)} content="${m.content.slice(0, 60).replace(/\n/g, ' ')}"`,
    )
  })
  await p.$disconnect()
})()
