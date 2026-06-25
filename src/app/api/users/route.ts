import { NextResponse } from 'next/server'
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
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
