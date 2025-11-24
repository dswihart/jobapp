import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  extractSkillsFromJob,
  saveSkillsToDatabase,
  getSkillStats,
  searchSkills,
  matchUserSkills,
  updateSkillTrends
} from '@/lib/skill-service'

// GET /api/skills - List skills with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (action) {
      case 'stats':
        const stats = await getSkillStats()
        return NextResponse.json({ success: true, data: stats })

      case 'search':
        const skills = await searchSkills(query, category, limit)
        return NextResponse.json({ success: true, data: skills })

      case 'categories':
        const categories = await prisma.skillCategory.findMany({
          orderBy: { sortOrder: 'asc' }
        })
        return NextResponse.json({ success: true, data: categories })

      case 'match':
        // Get user's skills and find matches
        const user = await prisma.user.findUnique({
          where: { id: session.user.id as string },
          select: { skills: true, primarySkills: true, secondarySkills: true }
        })
        const allUserSkills = [
          ...(user?.skills || []),
          ...(user?.primarySkills || []),
          ...(user?.secondarySkills || [])
        ]
        const matches = await matchUserSkills(allUserSkills)
        return NextResponse.json({ success: true, data: matches })

      case 'trending':
        const trending = await prisma.skill.findMany({
          where: { demandTrend: 'rising' },
          orderBy: { frequency: 'desc' },
          take: 20
        })
        return NextResponse.json({ success: true, data: trending })

      case 'list':
      default:
        const allSkills = await prisma.skill.findMany({
          orderBy: { frequency: 'desc' },
          take: limit,
          include: {
            _count: { select: { jobSkills: true } }
          }
        })
        return NextResponse.json({ success: true, data: allSkills })
    }
  } catch (error) {
    console.error('Skills API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/skills - Extract skills from job or build database
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'extract':
        // Extract skills from a single job description
        const { jobDescription, jobTitle, company, requirements, jobUrl } = body
        if (!jobDescription || !jobTitle) {
          return NextResponse.json(
            { error: 'jobDescription and jobTitle are required' },
            { status: 400 }
          )
        }

        const extracted = await extractSkillsFromJob(jobDescription, jobTitle, company, requirements)
        const saved = await saveSkillsToDatabase(extracted, jobUrl)

        return NextResponse.json({
          success: true,
          data: {
            skills: extracted.skills,
            savedCount: saved.savedCount,
            updatedCount: saved.updatedCount
          }
        })

      case 'build-from-opportunities':
        // Build skill database from existing job opportunities
        const opportunities = await prisma.jobOpportunity.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            company: true,
            description: true,
            requirements: true,
            jobUrl: true
          },
          take: parseInt(body.limit || '100')
        })

        let totalSaved = 0
        let totalUpdated = 0
        let processed = 0

        for (const opp of opportunities) {
          try {
            const result = await extractSkillsFromJob(
              opp.description,
              opp.title,
              opp.company,
              opp.requirements || undefined
            )
            const saveResult = await saveSkillsToDatabase(result, opp.jobUrl)
            totalSaved += saveResult.savedCount
            totalUpdated += saveResult.updatedCount
            processed++
          } catch (err) {
            console.error(`Error processing opportunity ${opp.id}:`, err)
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            processed,
            totalSaved,
            totalUpdated
          }
        })

      case 'build-from-applications':
        // Build skill database from application notes (which contain job descriptions)
        const applications = await prisma.application.findMany({
          where: {
            notes: { not: null }
          },
          select: {
            id: true,
            role: true,
            company: true,
            notes: true,
            jobUrl: true
          },
          take: parseInt(body.limit || '100')
        })

        let appSaved = 0
        let appUpdated = 0
        let appProcessed = 0

        for (const app of applications) {
          if (!app.notes) continue
          try {
            const result = await extractSkillsFromJob(
              app.notes,
              app.role,
              app.company
            )
            const saveResult = await saveSkillsToDatabase(result, app.jobUrl || undefined)
            appSaved += saveResult.savedCount
            appUpdated += saveResult.updatedCount
            appProcessed++
          } catch (err) {
            console.error(`Error processing application ${app.id}:`, err)
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            processed: appProcessed,
            totalSaved: appSaved,
            totalUpdated: appUpdated
          }
        })

      case 'update-trends':
        await updateSkillTrends()
        return NextResponse.json({ success: true, message: 'Trends updated' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Skills API error:', error)
    return NextResponse.json(
      { error: 'Failed to process skills', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
