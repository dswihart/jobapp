const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { id: 'default-user-id' }, select: { id: true, email: true, name: true } })
  const apps = await prisma.application.findMany({
    where: { userId: 'default-user-id' },
    select: {
      id: true,
      company: true,
      role: true,
      status: true,
      interviewDate: true,
      interviewTime: true,
      interviewType: true,
      interviewRound: true,
      interviewNotes: true,
      updatedAt: true,
    },
    orderBy: [{ interviewDate: 'asc' }, { updatedAt: 'desc' }],
  })
  const interviews = await prisma.interview.findMany({
    where: { applicationId: { in: apps.map(a => a.id) } },
    select: {
      id: true,
      applicationId: true,
      scheduledDate: true,
      scheduledTime: true,
      interviewType: true,
      round: true,
      status: true,
      preparationNotes: true,
      updatedAt: true,
    },
    orderBy: [{ scheduledDate: 'asc' }, { updatedAt: 'desc' }],
  })

  console.log(JSON.stringify({ user, apps: apps.filter(a => a.interviewDate), interviews }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
