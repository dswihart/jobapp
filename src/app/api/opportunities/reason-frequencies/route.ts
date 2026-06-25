import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patterns = await prisma.$queryRaw<Array<{
      pattern_value: string
      frequency: number
    }>>`
      SELECT pattern_value, frequency
      FROM rejection_patterns
      WHERE user_id = ${session.user.id}
        AND pattern_type = 'REJECTION_REASON'
      ORDER BY frequency DESC
    `

    const frequencies: Record<string, number> = {}
    for (const p of patterns) {
      frequencies[p.pattern_value] = p.frequency
    }

    return NextResponse.json({ frequencies })
  } catch (error) {
    console.error('Error fetching reason frequencies:', error)
    return NextResponse.json({ frequencies: {} })
  }
}
