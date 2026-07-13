import { NextRequest, NextResponse } from 'next/server'
import { monitorJobBoards } from '@/lib/job-monitor'
import { sendNewJobsEmail } from '@/lib/email'
import { syncApplicationEmailsForUser } from '@/lib/email-sync'
import { prisma } from '@/lib/prisma'
import { requireCronSecret } from '@/lib/api-auth'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const cronError = requireCronSecret(request)
    if (cronError) return cronError

    // Get all users that need job scans and/or Gmail sync
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { autoScan: true },
          { emailSyncEnabled: true }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        autoScan: true,
        emailSyncEnabled: true,
      }
    })

    console.log(`[Cron Scan] Found ${users.length} users with scan and/or email sync enabled`)

    let totalJobs = 0
    const results = []

    for (const user of users) {
      try {
        console.log(`[Cron Scan] Scanning for user: ${user.email}`)

        let count = 0
        let emailSyncImported = 0

        if (user.autoScan) {
          // Snapshot job IDs before scan
          const before = await prisma.jobOpportunity.findMany({
            where: { userId: user.id },
            select: { id: true }
          })
          const beforeIds = new Set(before.map(j => j.id))

          count = await monitorJobBoards(user.id)
          totalJobs += count

          // Find newly added jobs
          if (count > 0 && user.email) {
            const newJobs = await prisma.jobOpportunity.findMany({
              where: {
                userId: user.id,
                id: { notIn: [...beforeIds] },
                fitScore: { gt: 50 }
              },
              select: {
                title: true,
                company: true,
                location: true,
                fitScore: true,
                jobUrl: true,
                salary: true
              },
              orderBy: { fitScore: 'desc' }
            })

            if (false /* new-job match emails disabled 2026-07-13 per user; restore to "newJobs.length > 0" to re-enable */ && newJobs.length > 0) {
              await sendNewJobsEmail(process.env.NOTIFY_EMAIL || user.email, newJobs).catch(err =>
                console.error(`[Cron Scan] Email failed for ${user.email}:`, err)
              )
            }
          }
        }

        if (user.emailSyncEnabled) {
          const syncSummary = await syncApplicationEmailsForUser(user.id)
          emailSyncImported = syncSummary.imported
        }

        results.push({
          userId: user.id,
          email: user.email,
          jobsFound: count,
          emailSyncImported,
          success: true
        })
        console.log(`[Cron Scan] Processed ${user.email}: jobs=${count}, syncedEmails=${emailSyncImported}`)
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
