import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Fetch all users with their basic info and stats
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

    // Transform the data for the frontend
    const usersWithStats = users.map(user => ({
      userId: user.id,
      userName: user.name || user.email?.split('@')[0] || 'User',
      email: user.email,
      dailyGoal: 5, // Default goal for now
      totalApplications: user._count.applications
    }))

    return NextResponse.json(usersWithStats)
  } catch (error) {
    console.error('Error fetching users list:', error)
    return NextResponse.json({ error: 'Failed to fetch users list' }, { status: 500 })
  }
}
