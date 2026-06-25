import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (authResult.response) return authResult.response

  try {
    const { id } = await params

    const alert = await prisma.alert.findUnique({ where: { id }, select: { userId: true } })
    if (!alert || alert.userId !== authResult.user.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    await prisma.alert.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Alert deleted' })
  } catch (error) {
    console.error('Delete alert error:', error)
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
  }
}
