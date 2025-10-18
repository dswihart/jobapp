import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        minFitScore: true,
        maxJobAgeDays: true,
        autoScan: true,
        scanFrequency: true,
        dailyApplicationGoal: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      settings: {
        minFitScore: user.minFitScore ?? 40,
        maxJobAgeDays: user.maxJobAgeDays ?? 7,
        autoScan: user.autoScan ?? false,
        scanFrequency: user.scanFrequency ?? 'daily',
        dailyApplicationGoal: user.dailyApplicationGoal ?? 6
      }
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, settings } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        minFitScore: settings.minFitScore,
        maxJobAgeDays: settings.maxJobAgeDays,
        autoScan: settings.autoScan,
        scanFrequency: settings.scanFrequency,
        dailyApplicationGoal: settings.dailyApplicationGoal
      }
    })

    console.log(`[Settings API] Updated settings for user ${userId}:`, settings)

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        minFitScore: updatedUser.minFitScore ?? 40,
        maxJobAgeDays: updatedUser.maxJobAgeDays ?? 7,
        autoScan: updatedUser.autoScan ?? false,
        scanFrequency: updatedUser.scanFrequency ?? 'daily',
        dailyApplicationGoal: updatedUser.dailyApplicationGoal ?? 6
      }
    })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
