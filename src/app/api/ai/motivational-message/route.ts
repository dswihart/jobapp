import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // Fall back to a default motivational message if no API key
      return NextResponse.json({
        message: "Keep pushing forward! Every application brings you closer to your dream job! 🚀",
        isDefault: true
      })
    }

    // Get user stats for personalization (if userId provided)
    let userContext = ''
    if (userId && userId !== 'community') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      })

      // Get application stats for the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const applications = await prisma.application.findMany({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo }
        }
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayCount = await prisma.application.count({
        where: {
          userId,
          OR: [
            { status: 'APPLIED' },
            { status: 'INTERVIEWING' }
          ],
          AND: {
            OR: [
              {
                appliedDate: {
                  gte: today,
                  lt: tomorrow
                }
              },
              {
                AND: [
                  { appliedDate: null },
                  {
                    updatedAt: {
                      gte: today,
                      lt: tomorrow
                    }
                  }
                ]
              }
            ]
          }
        }
      })

      const totalApplications = await prisma.application.count({
        where: { userId }
      })

      const interviewCount = await prisma.application.count({
        where: { userId, status: 'INTERVIEWING' }
      })

      const weeklyApplications = applications.length
      const dailyGoal = 5
      const userName = user?.name || 'there'

      userContext = `User: ${userName}
Today's applications: ${todayCount}
Daily goal: ${dailyGoal}
Weekly applications: ${weeklyApplications}
Total applications: ${totalApplications}
Current interviews: ${interviewCount}
Progress today: ${todayCount >= dailyGoal ? 'Goal achieved!' : `${dailyGoal - todayCount} more to reach goal`}`
    } else {
      // Community stats context
      const totalApplications = await prisma.application.count()
      const todayCount = await prisma.application.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
      userContext = `Community view - Total applications: ${totalApplications}, Today: ${todayCount}`
    }

    // Call Claude API for personalized message
    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 100,
      temperature: 0.9,
      messages: [
        {
          role: 'user',
          content: `Generate a short, motivating message for a job seeker. Make it encouraging, specific, and actionable. Use an emoji at the end. Keep it under 20 words. Be creative and vary your responses.

Context:
${userContext}

Important:
- If they've reached their daily goal, celebrate it!
- If they're close, encourage them to finish strong
- If they're just starting, motivate them to begin
- If they have interviews, acknowledge their progress
- Keep it fresh and unique each time`
        }
      ]
    })

    const motivationalMessage = message.content[0].type === 'text'
      ? message.content[0].text
      : "Keep pushing forward! Your dream job awaits! 🌟"

    return NextResponse.json({
      message: motivationalMessage,
      isDefault: false,
      context: {
        userId: userId || 'community',
        generated: true
      }
    })

  } catch (error) {
    console.error('Error generating motivational message:', error)

    // Fallback messages if API fails
    const fallbackMessages = [
      "You're doing amazing! Keep going! 🚀",
      "Every application counts! Stay strong! 💪",
      "Your persistence will pay off! ⭐",
      "Today is your day to shine! ✨",
      "Keep pushing - success is near! 🎯"
    ]

    const randomIndex = Math.floor(Math.random() * fallbackMessages.length)

    return NextResponse.json({
      message: fallbackMessages[randomIndex],
      isDefault: true
    })
  }
}

// Optional: POST endpoint to cache messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, message } = body

    // Store the message in cache or database if needed
    // This could be used to avoid too many API calls

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to cache message' },
      { status: 500 }
    )
  }
}