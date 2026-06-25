const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'mobile-test-1781775591541@example.com' } })
  const opportunity = await prisma.jobOpportunity.create({
    data: {
      title: 'Cloud Security Analyst',
      company: 'Feedback Verify Co',
      description: 'Disposable opportunity for post-deploy feedback verification',
      location: 'Berlin, Germany',
      jobUrl: `https://example.com/jobs/feedback-verify-${Date.now()}`,
      source: 'ManualTest',
      userId: user.id,
      fitScore: 38,
    },
    select: { id: true },
  })
  console.log(opportunity.id)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
