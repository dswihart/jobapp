import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { requireAuthenticatedUser } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser()
    if (authResult.response) {
      return authResult.response
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new password are required' },
        { status: 400 }
      )
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
