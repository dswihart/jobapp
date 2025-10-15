import { NextRequest, NextResponse } from 'next/server'
import { getUnreadAlerts } from '@/lib/job-monitor'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const alerts = await getUnreadAlerts(userId)

    return NextResponse.json({
      success: true,
      alerts
    })
  } catch (error) {
    console.error('Alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Delete all alerts for this user
    await prisma.alert.deleteMany({
      where: { userId }
    })

    return NextResponse.json({
      success: true,
      message: 'All alerts deleted'
    })
  } catch (error) {
    console.error('Delete alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to delete alerts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
