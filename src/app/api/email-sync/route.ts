import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/api-auth'
import { syncApplicationEmailsForUser } from '@/lib/email-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const summary = await syncApplicationEmailsForUser(authResult.user.id)
    return NextResponse.json({
      success: true,
      summary,
    })
  } catch (error) {
    console.error('Email sync failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync Gmail',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
