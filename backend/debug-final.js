const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const s = await p.interviewSession.findUnique({
    where: { id: 'cmqhr3kw50001y791zpkds9zy' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  console.log('Total:', s.messages.length)
  s.messages.forEach((m, i) => {
    const m2 = JSON.parse(m.meta || '{}')
    console.log(
      `[${i}] ${m.role} qIdx=${m2.questionIndex ?? '-'} content="${m.content.slice(0, 60).replace(/\n/g, ' ')}"`,
    )
  })
  await p.$disconnect()
})()
