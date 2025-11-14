import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Calculate date 45 days ago
    const fortyFiveDaysAgo = new Date()
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)

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

    return NextResponse.json({
      success: true,
      message: 'Old applications archived successfully',
      rejectedArchived: archivedRejected.count,
      draftsArchived: archivedDrafts.count,
      totalArchived: archivedRejected.count + archivedDrafts.count
    })
  } catch (error) {
    console.error('Error archiving old applications:', error)
    return NextResponse.json(
      { error: 'Failed to archive old applications' },
      { status: 500 }
    )
  }
}
