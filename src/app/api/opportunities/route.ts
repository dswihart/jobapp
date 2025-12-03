import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')?.toLowerCase().trim()
    const minScore = parseInt(searchParams.get('minScore') || '0')

    // Build the where clause
    const whereClause: Record<string, unknown> = {
      userId: session.user.id,
      isArchived: false
    }

    // Add fit score filter if specified
    if (minScore > 0) {
      whereClause.fitScore = { gte: minScore }
    }

    // Fetch opportunities
    let opportunities = await prisma.jobOpportunity.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Apply text search filter if provided
    if (search && search.length > 0) {
      const searchTerms = search.split(/\s+/).filter(term => term.length > 0)
      
      opportunities = opportunities.filter(job => {
        const searchableText = [
          job.title,
          job.company,
          job.description,
          job.location,
          job.requirements
        ].filter(Boolean).join(' ').toLowerCase()

        // All search terms must match
        return searchTerms.every(term => searchableText.includes(term))
      })
    }

    return NextResponse.json({
      success: true,
      opportunities,
      total: opportunities.length
    })
  } catch (error) {
    console.error('Opportunities error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunities', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
