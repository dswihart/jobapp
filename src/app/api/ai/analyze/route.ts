import { NextRequest, NextResponse } from 'next/server'
import { analyzeJobFit, UserProfile, JobDescription } from '@/lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userProfile, jobDescription } = body

    if (!userProfile || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: userProfile and jobDescription' },
        { status: 400 }
      )
    }

    const fitScore = await analyzeJobFit(userProfile as UserProfile, jobDescription)

    return NextResponse.json({
      success: true,
      fitScore,
      analyzedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('AI Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze job fit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
