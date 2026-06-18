const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
;(async () => {
  const r = await p.interviewReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  console.log('Last 5 reports:')
  r.forEach((rep) => {
    console.log('---', rep.sessionId)
    console.log('Summary:', (rep.summary || '').slice(0, 250))
  })
  await p.$disconnect()
})()
