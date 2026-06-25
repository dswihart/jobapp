const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'mobile-test-1781775591541@example.com' } })
  if (!user) throw new Error('User not found')

  const opportunity = await prisma.jobOpportunity.create({
    data: {
      title: 'Senior Security Engineer',
      company: 'Feedback Test Co',
      description: 'Disposable opportunity for thumbs-down verification',
      location: 'Madrid, Spain',
      jobUrl: `https://example.com/jobs/feedback-test-${Date.now()}`,
      source: 'ManualTest',
      userId: user.id,
      fitScore: 42,
    },
    select: { id: true, userId: true, title: true, location: true },
  })

  console.log(JSON.stringify(opportunity))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
