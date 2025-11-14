import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function archiveOldJobs() {
  try {
    console.log('Starting job archival process...')
    
    // Calculate date 45 days ago
    const fortyFiveDaysAgo = new Date()
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)
    
    console.log(`Archiving jobs older than: ${fortyFiveDaysAgo.toISOString().split('T')[0]}`)

    // Archive applications that are REJECTED and older than 45 days
    const archivedRejected = await prisma.application.updateMany({
      where: {
        status: 'REJECTED',
        updatedAt: {
          lt: fortyFiveDaysAgo
        }
      },
      data: {
        status: 'ARCHIVED'
      }
    })

    console.log(`Archived ${archivedRejected.count} REJECTED applications`)

    // Also archive DRAFT applications older than 45 days
    const archivedDrafts = await prisma.application.updateMany({
      where: {
        status: 'DRAFT',
        createdAt: {
          lt: fortyFiveDaysAgo
        }
      },
      data: {
        status: 'ARCHIVED'
      }
    })

    console.log(`Archived ${archivedDrafts.count} DRAFT applications`)

    const totalArchived = archivedRejected.count + archivedDrafts.count
    console.log(`Total applications archived: ${totalArchived}`)

    return {
      rejectedArchived: archivedRejected.count,
      draftsArchived: archivedDrafts.count,
      totalArchived
    }
  } catch (error) {
    console.error('Error archiving old jobs:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

archiveOldJobs()
  .then(result => {
    console.log('Archival completed successfully:', result)
    process.exit(0)
  })
  .catch(error => {
    console.error('Archival failed:', error)
    process.exit(1)
  })
