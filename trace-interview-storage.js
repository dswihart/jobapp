const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } })
  const windowStart = new Date('2026-06-18T00:00:00.000Z')
  const windowEnd = new Date('2026-06-24T23:59:59.999Z')

  const applications = await prisma.application.findMany({
    where: {
      OR: [
        { interviewDate: { gte: windowStart, lte: windowEnd } },
        { updatedAt: { gte: windowStart, lte: windowEnd } },
        { status: 'INTERVIEWING' }
      ]
    },
    select: {
      id: true, company: true, role: true, userId: true, status: true,
      interviewDate: true, interviewTime: true, interviewType: true, interviewRound: true, interviewNotes: true,
      notes: true, updatedAt: true, createdAt: true, jobUrl: true
    },
    orderBy: { updatedAt: 'desc' }
  })

  const interviews = await prisma.interview.findMany({
    where: {
      OR: [
        { scheduledDate: { gte: windowStart, lte: windowEnd } },
        { updatedAt: { gte: windowStart, lte: windowEnd } },
        { status: { in: ['scheduled', 'rescheduled'] } }
      ]
    },
    select: {
      id: true, applicationId: true, scheduledDate: true, scheduledTime: true,
      interviewType: true, round: true, stage: true, location: true, meetingLink: true,
      status: true, preparationNotes: true, postInterviewNotes: true, updatedAt: true, createdAt: true
    },
    orderBy: { updatedAt: 'desc' }
  })

  const followUps = await prisma.followUp.findMany({
    where: {
      OR: [
        { type: 'interview' },
        { dueDate: { gte: windowStart, lte: windowEnd } },
        { updatedAt: { gte: windowStart, lte: windowEnd } }
      ]
    },
    select: {
      id: true, title: true, description: true, dueDate: true, userId: true, applicationId: true,
      type: true, completed: true, updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  })

  const contacts = await prisma.contact.findMany({
    where: { updatedAt: { gte: windowStart, lte: windowEnd } },
    select: { id: true, name: true, title: true, email: true, notes: true, applicationId: true, userId: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' }
  })

  const userMap = Object.fromEntries(users.map(u => [u.id, u]))
  console.log(JSON.stringify({
    applications: applications.map(a => ({ ...a, user: userMap[a.userId] })),
    interviews,
    followUps: followUps.map(f => ({ ...f, user: userMap[f.userId] })),
    contacts: contacts.map(c => ({ ...c, user: userMap[c.userId] })),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
