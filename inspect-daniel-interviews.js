const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const userId = 'default-user-id'
  const interviews = await prisma.interview.findMany({
    where: { applicationId: { in: (await prisma.application.findMany({ where: { userId }, select: { id: true } })).map(a => a.id) } },
    select: { id: true, applicationId: true, scheduledDate: true, scheduledTime: true, status: true },
    orderBy: { scheduledDate: 'asc' }
  })

  const legacy = await prisma.application.findMany({
    where: { userId, interviewDate: { not: null } },
    select: { id: true, company: true, role: true, interviewDate: true, interviewTime: true, interviewType: true, interviewRound: true, status: true },
    orderBy: { interviewDate: 'asc' }
  })

  console.log(JSON.stringify({ interviewCount: interviews.length, interviews, legacyCount: legacy.length, legacy }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
