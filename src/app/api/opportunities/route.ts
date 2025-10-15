import { NextRequest, NextResponse } from 'next/server'
import { getJobOpportunities } from '@/lib/job-monitor'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const opportunities = await getJobOpportunities(session.user.id)

    return NextResponse.json({
      success: true,
      opportunities
    })
  } catch (error) {
    console.error('Opportunities error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunities', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
