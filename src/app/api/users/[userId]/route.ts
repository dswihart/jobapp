import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/api-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireAdminUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const { userId } = await params

    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      email: deletedUser.email
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
