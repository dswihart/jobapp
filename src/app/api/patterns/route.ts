import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patterns = await prisma.$queryRaw<Array<{
    id: number
    pattern_type: string
    pattern_value: string
    frequency: number
    last_seen: Date
  }>>`
    SELECT id, pattern_type, pattern_value, frequency, last_seen
    FROM rejection_patterns
    WHERE user_id = ${session.user.id}
    ORDER BY frequency DESC, last_seen DESC
  `

  return NextResponse.json({ patterns })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.$executeRaw`
    DELETE FROM rejection_patterns WHERE id = ${Number(id)} AND user_id = ${session.user.id}
  `

  return NextResponse.json({ success: true })
}
