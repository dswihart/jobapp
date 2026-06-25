import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await prisma.application.updateMany({
      where: {
        userId: session.user.id,
        status: { notIn: ['ARCHIVED', 'REJECTED'] },
        createdAt: { lt: thirtyDaysAgo }
      },
      data: { status: 'ARCHIVED' }
    })

    return NextResponse.json({ archived: result.count })
  } catch (error) {
    console.error('Auto-archive failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
