import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const requestedUserId = request.nextUrl.searchParams.get('userId')
    if (requestedUserId && requestedUserId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        minFitScore: true,
        maxJobAgeDays: true,
        autoScan: true,
        scanFrequency: true,
        dailyApplicationGoal: true,
        notificationThreshold: true,
        emailSyncEnabled: true,
        emailSyncLookbackDays: true,
        lastEmailSyncAt: true,
        lastEmailSyncError: true,
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
        dailyApplicationGoal: user.dailyApplicationGoal ?? 6,
        notificationThreshold: user.notificationThreshold ?? 80,
        emailSyncEnabled: user.emailSyncEnabled ?? false,
        emailSyncLookbackDays: user.emailSyncLookbackDays ?? 14,
        lastEmailSyncAt: user.lastEmailSyncAt,
        lastEmailSyncError: user.lastEmailSyncError,
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
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { settings, userId } = body

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings are required' },
        { status: 400 }
      )
    }

    if (userId && userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        minFitScore: settings.minFitScore != null
          ? Math.min(100, Math.max(0, Math.round(Number(settings.minFitScore))))
          : undefined,
        maxJobAgeDays: settings.maxJobAgeDays != null
          ? Math.min(365, Math.max(1, Math.round(Number(settings.maxJobAgeDays))))
          : undefined,
        autoScan: typeof settings.autoScan === "boolean" ? settings.autoScan : undefined,
        scanFrequency: settings.scanFrequency,
        dailyApplicationGoal: settings.dailyApplicationGoal != null
          ? Math.min(50, Math.max(1, Math.round(Number(settings.dailyApplicationGoal))))
          : undefined,
        notificationThreshold: settings.notificationThreshold != null
          ? Math.min(100, Math.max(0, Math.round(Number(settings.notificationThreshold))))
          : undefined,
        emailSyncEnabled: typeof settings.emailSyncEnabled === 'boolean' ? settings.emailSyncEnabled : undefined,
        emailSyncLookbackDays: settings.emailSyncLookbackDays != null
          ? Math.min(60, Math.max(1, Math.round(Number(settings.emailSyncLookbackDays))))
          : undefined,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        minFitScore: updatedUser.minFitScore ?? 40,
        maxJobAgeDays: updatedUser.maxJobAgeDays ?? 7,
        autoScan: updatedUser.autoScan ?? false,
        scanFrequency: updatedUser.scanFrequency ?? 'daily',
        dailyApplicationGoal: updatedUser.dailyApplicationGoal ?? 6,
        notificationThreshold: updatedUser.notificationThreshold ?? 80,
        emailSyncEnabled: updatedUser.emailSyncEnabled ?? false,
        emailSyncLookbackDays: updatedUser.emailSyncLookbackDays ?? 14,
        lastEmailSyncAt: updatedUser.lastEmailSyncAt,
        lastEmailSyncError: updatedUser.lastEmailSyncError,
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
