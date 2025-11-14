import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debug() {
  try {
    console.log('Checking database for opportunities...')
    
    // Get all opportunities
    const allOpps = await prisma.jobOpportunity.findMany({
      select: {
        id: true,
        title: true,
        company: true,
        fitScore: true,
        location: true,
        isArchived: true,
        userId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    
    console.log(`\nTotal opportunities in DB: ${allOpps.length}`)
    console.log(`Non-archived: ${allOpps.filter(o => !o.isArchived).length}`)
    
    if (allOpps.length > 0) {
      console.log('\nAll opportunities:')
      allOpps.forEach((opp, i) => {
        const archived = opp.isArchived ? '[ARCHIVED]' : ''
        console.log(`${i+1}. ${opp.title} at ${opp.company} ${archived}`)
        console.log(`   User: ${opp.userId}, Fit: ${opp.fitScore}%, Location: ${opp.location || 'N/A'}`)
      })
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

debug()
