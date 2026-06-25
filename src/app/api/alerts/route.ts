import { NextResponse } from 'next/server'
import { getUnreadAlerts } from '@/lib/job-monitor'
import { prisma } from '@/lib/prisma'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function GET() {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) return authResult.response

  try {
    const alerts = await getUnreadAlerts(authResult.user.id)
    return NextResponse.json({ success: true, alerts })
  } catch (error) {
    console.error('Alerts error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function DELETE() {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) return authResult.response

  try {
    await prisma.alert.deleteMany({ where: { userId: authResult.user.id } })
    return NextResponse.json({ success: true, message: 'All alerts deleted' })
  } catch (error) {
    console.error('Delete alerts error:', error)
    return NextResponse.json({ error: 'Failed to delete alerts' }, { status: 500 })
  }
}
