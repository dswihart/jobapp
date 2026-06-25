const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function stripEmailSyncNotes(notes) {
  if (!notes) {
    return notes
  }

  return notes
    .replace(/(?:\n{2})?\[Email Sync [\s\S]*?(?=(?:\n{2}\[Email Sync )|$)/g, '')
    .trim() || null
}

async function main() {
  const applications = await prisma.application.findMany({
    where: {
      notes: {
        contains: '[Email Sync ',
      },
    },
    select: {
      id: true,
      notes: true,
    },
  })

  for (const application of applications) {
    await prisma.application.update({
      where: { id: application.id },
      data: {
        notes: stripEmailSyncNotes(application.notes),
      },
    })
  }

  await prisma.alert.deleteMany({
    where: {
      type: 'APPLICATION_UPDATE',
      createdAt: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    },
  })

  await prisma.emailSyncEvent.deleteMany({})

  await prisma.user.update({
    where: { id: 'default-user-id' },
    data: {
      lastEmailSyncAt: null,
      lastEmailSyncError: null,
    },
  })

  console.log(JSON.stringify({ cleanedApplications: applications.length }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
