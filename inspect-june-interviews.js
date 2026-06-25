const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const start = new Date('2026-06-19T00:00:00.000Z')
  const end = new Date('2026-06-23T23:59:59.999Z')

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  const apps = await prisma.application.findMany({
    where: {
      interviewDate: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      company: true,
      role: true,
      userId: true,
      interviewDate: true,
      interviewTime: true,
      interviewType: true,
      interviewRound: true,
      status: true,
    },
    orderBy: { interviewDate: 'asc' },
  })

  const interviews = await prisma.interview.findMany({
    where: {
      scheduledDate: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      applicationId: true,
      scheduledDate: true,
      scheduledTime: true,
      interviewType: true,
      round: true,
      status: true,
    },
    orderBy: { scheduledDate: 'asc' },
  })

  const appById = new Map((await prisma.application.findMany({
    select: { id: true, company: true, role: true, userId: true, status: true }
  })).map(a => [a.id, a]))
  const userById = new Map(users.map(u => [u.id, u]))

  console.log(JSON.stringify({
    legacy: apps.map(app => ({ ...app, user: userById.get(app.userId) })),
    interviews: interviews.map(interview => ({ ...interview, application: appById.get(interview.applicationId), user: userById.get(appById.get(interview.applicationId)?.userId) })),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
