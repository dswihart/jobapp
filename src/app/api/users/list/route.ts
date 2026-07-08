import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function isPublicDanielAccount(user: { email?: string | null; name?: string | null }) {
  const email = (user.email || '').toLowerCase()
  const name = (user.name || '').toLowerCase()

  return (
    email.includes('dswihart') ||
    email.includes('swihart') ||
    name.includes('daniel swihart')
  )
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const usersWithStats = users
      .filter(isPublicDanielAccount)
      .map(user => ({
      userId: user.id,
      userName: user.name || 'User',
      dailyGoal: 4,
      totalApplications: user._count.applications
      }))

    return NextResponse.json(usersWithStats)
  } catch (error) {
    console.error('Error fetching users list:', error)
    return NextResponse.json({ error: 'Failed to fetch users list' }, { status: 500 })
  }
}
