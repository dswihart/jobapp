import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/api-auth'

export async function GET() {
  const authResult = await requireAdminUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        autoScan: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      count: users.length,
      users
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdminUser()
  if (authResult.response) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { userIds } = body

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({
        error: 'userIds array is required'
      }, { status: 400 })
    }

    const deleted = await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds
        }
      }
    })

    return NextResponse.json({
      success: true,
      deleted: deleted.count,
      message: `Deleted ${deleted.count} users`
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
