import { NextRequest, NextResponse } from 'next/server'
import { monitorJobBoards } from '@/lib/job-monitor'
import { prisma } from '@/lib/prisma'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    // Check for cron secret key
    const cronSecret = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET || 'change-this-secret'
    
    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all users with autoScan enabled
    const users = await prisma.user.findMany({
      where: {
        autoScan: true
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    console.log(`[Cron Scan] Found ${users.length} users with autoScan enabled`)

    let totalJobs = 0
    const results = []

    // Scan for each user
    for (const user of users) {
      try {
        console.log(`[Cron Scan] Scanning for user: ${user.email}`)
        const count = await monitorJobBoards(user.id)
        totalJobs += count
        results.push({
          userId: user.id,
          email: user.email,
          jobsFound: count,
          success: true
        })
        console.log(`[Cron Scan] Found ${count} new jobs for ${user.email}`)
      } catch (error) {
        console.error(`[Cron Scan] Error scanning for user ${user.email}:`, error)
        results.push({
          userId: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scanned ${users.length} users`,
      totalJobsFound: totalJobs,
      results
    })
  } catch (error) {
    console.error('[Cron Scan] Error:', error)
    return NextResponse.json(
      { 
        error: 'Cron scan failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
