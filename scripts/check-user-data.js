const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserData() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'pgollotte@gmail.com' },
      include: {
        jobSources: true,
        jobs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!user) {
      console.log('User not found')
      return
    }

    console.log('User:', {
      email: user.email,
      name: user.name,
      autoScan: user.autoScan,
      minFitScore: user.minFitScore,
      maxJobAgeDays: user.maxJobAgeDays
    })

    console.log('\nJob Sources:', user.jobSources.length)
    user.jobSources.forEach(source => {
      console.log(`  - ${source.name} (${source.sourceType}) - enabled: ${source.enabled}`)
      if (source.feedUrl) console.log(`    Feed: ${source.feedUrl}`)
    })

    console.log('\nJobs Found:', user.jobs.length)
    user.jobs.forEach(job => {
      console.log(`  - ${job.title} at ${job.company} (fit: ${job.fitScore})`)
    })

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserData()
