import { NextRequest, NextResponse } from 'next/server'
import { monitorJobBoards } from '@/lib/job-monitor'
import { auth } from '@/lib/auth'

export const maxDuration = 300 // 5 minutes max

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Start the scan in background
    monitorJobBoards(userId).then(count => {
      console.log(`[Monitor API] Background scan completed: ${count} new jobs`)
    }).catch(error => {
      console.error('[Monitor API] Background scan error:', error)
    })

    // Return immediately
    return NextResponse.json({
      success: true,
      message: 'Job scan started. Check back in a moment for results.',
      scanning: true
    })
  } catch (error) {
    console.error('Monitor error:', error)
    return NextResponse.json(
      { error: 'Failed to monitor job boards', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
