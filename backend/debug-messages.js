const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const sessions = await p.interviewSession.findMany({
    orderBy: { startedAt: 'desc' },
    take: 3,
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  for (const session of sessions) {
    console.log('\n========== Session:', session.id, '==========')
    console.log('Status:', session.status, '  Total msgs:', session.messages.length)
    session.messages.forEach((m, i) => {
      let meta = {}
      try { meta = JSON.parse(m.meta || '{}') } catch {}
      console.log(
        `[${i}] role=${m.role.padEnd(11)} qIdx=${String(meta.questionIndex ?? '-').padEnd(3)} skill=${(meta.skill ?? '-').padEnd(10)} depth=${meta.depth ?? '-'} content="${m.content.slice(0, 70).replace(/\n/g, ' ')}"`,
      )
    })
  }
  await p.$disconnect()
})()
