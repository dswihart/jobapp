import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Archive applications that are REJECTED and older than 30 days
    const archivedRejected = await prisma.application.updateMany({
      where: {
        status: 'REJECTED',
        updatedAt: {
          lt: thirtyDaysAgo
        }
      },
      data: {
        status: 'ARCHIVED'
      }
    })

    // Also archive DRAFT applications older than 30 days
    const archivedDrafts = await prisma.application.updateMany({
      where: {
        status: 'DRAFT',
        createdAt: {
          lt: thirtyDaysAgo
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
