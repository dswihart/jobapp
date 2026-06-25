/**
 * One-off: thumbs-down all active DevSecOps opportunities exactly as the
 * feedback endpoint (BAD_MATCH) would — learn rejection patterns, block the
 * URL, then delete. Run with: npx -y tsx src/scripts/cleanup-devsecops.ts
 */
import { prisma } from '../lib/prisma'
import { learnFromRejection } from '../lib/pattern-learning-service'

const USER_ID = 'default-user-id'
const REASONS = ['not_relevant_skills']

async function run() {
  const jobs = await prisma.jobOpportunity.findMany({
    where: {
      userId: USER_ID,
      isArchived: false,
      OR: [
        { title: { contains: 'devsecops', mode: 'insensitive' } },
        { title: { contains: 'dev sec ops', mode: 'insensitive' } },
      ],
    },
  })

  console.log(`[Cleanup] Found ${jobs.length} active DevSecOps jobs`)
  let done = 0
  for (const job of jobs) {
    try {
      await learnFromRejection(
        USER_ID,
        {
          id: job.id,
          title: job.title,
          company: job.company,
          description: job.description,
          location: job.location || undefined,
          source: job.source,
          fitScore: job.fitScore || 0,
        },
        REASONS
      )
      try {
        await prisma.blockedJob.create({ data: { userId: USER_ID, jobUrl: job.jobUrl } })
      } catch (e: unknown) {
        if (!(e instanceof Error && 'code' in e && (e as { code: string }).code === 'P2002')) throw e
      }
      await prisma.jobOpportunity.delete({ where: { id: job.id } })
      done++
      console.log(`  ✓ ${job.title} @ ${job.company}`)
    } catch (e) {
      console.error(`  ✗ ${job.title}:`, e)
    }
  }
  console.log(`[Cleanup] Done: ${done}/${jobs.length} thumbed-down, blocked, removed`)
  await prisma.$disconnect()
}

run()
