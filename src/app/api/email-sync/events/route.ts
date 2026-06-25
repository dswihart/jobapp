import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Returns the job-search email activities recorded by Email Sync, scoped to the
// authenticated user. Optional ?applicationId= filters to one application.
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const applicationId = request.nextUrl.searchParams.get('applicationId') || undefined

  try {
    const events = await prisma.emailSyncEvent.findMany({
      where: { userId: session.user.id, ...(applicationId ? { applicationId } : {}) },
      select: {
        id: true,
        subject: true,
        fromName: true,
        fromAddress: true,
        classification: true,
        matchedCompany: true,
        snippet: true,
        receivedAt: true,
        applicationId: true,
      },
      orderBy: { receivedAt: 'desc' },
      take: applicationId ? 50 : 100,
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Failed to fetch email activities:', error)
    return NextResponse.json({ error: 'Failed to fetch email activities' }, { status: 500 })
  }
}
