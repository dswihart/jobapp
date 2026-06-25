import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, response } = await requireAuthenticatedUser()
    if (response) return response

    const userId = user.id

    // Group opportunities by source
    const sourceGroups = await prisma.jobOpportunity.groupBy({
      by: ['source'],
      where: { userId },
      _count: { id: true },
      _avg: { fitScore: true },
    })

    // Count thumbs up per source
    const goodMatches = await prisma.jobOpportunity.groupBy({
      by: ['source'],
      where: { userId, userFeedback: 'GOOD_MATCH' },
      _count: { id: true },
    })

    // Count applied per source (via applications joined by jobUrl)
    const appliedRaw = await prisma.$queryRaw<{ source: string; count: bigint }[]>`
      SELECT jo.source, COUNT(a.id) as count
      FROM job_opportunities jo
      JOIN applications a ON a."jobUrl" = jo."jobUrl" AND a."userId" = ${userId}
      WHERE jo."userId" = ${userId}
      GROUP BY jo.source
    `

    const goodMatchMap = Object.fromEntries(goodMatches.map(g => [g.source, g._count.id]))
    const appliedMap = Object.fromEntries(appliedRaw.map(r => [r.source, Number(r.count)]))

    const result = sourceGroups
      .filter(g => g.source !== null)
      .map(g => ({
        source: g.source,
        jobCount: g._count.id,
        avgFitScore: Math.round(g._avg.fitScore ?? 0),
        thumbsUp: goodMatchMap[g.source] ?? 0,
        appliedCount: appliedMap[g.source] ?? 0,
      }))
      .sort((a, b) => b.avgFitScore - a.avgFitScore)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Source analytics error:', error)
    return NextResponse.json({ error: 'Failed to load source analytics' }, { status: 500 })
  }
}
