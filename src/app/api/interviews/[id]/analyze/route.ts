import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import OpenAI from "openai"

// POST - Analyze interview transcript with AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params

    // Initialize OpenAI client inside the handler
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Find the interview
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { interviewers: true },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    // Verify user owns the related application
    const application = await prisma.application.findFirst({
      where: {
        id: interview.applicationId,
        userId,
      },
    })

    if (!application) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!interview.transcript || interview.transcript.trim().length < 50) {
      return NextResponse.json({
        error: "Transcript is too short for meaningful analysis. Please add more content."
      }, { status: 400 })
    }

    // Build context for AI analysis
    const interviewerNames = interview.interviewers.map(i => i.name).join(", ")
    const context = `
Company: ${application.company}
Role: ${application.role}
Interview Type: ${interview.interviewType}
Interview Round: ${interview.round}
Stage: ${interview.stage || "Not specified"}
${interviewerNames ? `Interviewers: ${interviewerNames}` : ""}
${interview.preparationNotes ? `Preparation Notes: ${interview.preparationNotes}` : ""}
    `.trim()

    // Call OpenAI for analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert interview coach and career advisor. Analyze interview transcripts to provide actionable insights. Be specific, constructive, and focus on helping the candidate improve and succeed.

Your response must be valid JSON with the following structure:
{
  "overallAssessment": {
    "score": 1-10,
    "summary": "Brief overall assessment",
    "strengths": ["strength1", "strength2"],
    "areasForImprovement": ["area1", "area2"]
  },
  "keyMoments": [
    {
      "type": "positive|negative|neutral",
      "description": "What happened",
      "impact": "How this likely affected the interview"
    }
  ],
  "questionsAsked": [
    {
      "question": "The question asked",
      "yourResponse": "Summary of the response given",
      "evaluation": "How well this was answered",
      "suggestedImprovement": "How to improve this answer"
    }
  ],
  "interviewerSentiment": {
    "overall": "positive|neutral|negative|mixed",
    "signals": ["signal1", "signal2"],
    "concerns": ["concern1", "concern2"]
  },
  "followUpSteps": [
    {
      "priority": "high|medium|low",
      "action": "What to do",
      "timing": "When to do it",
      "reason": "Why this is important"
    }
  ],
  "thankyouEmailPoints": [
    "Point to include in thank you email"
  ],
  "nextRoundPreparation": {
    "likelyTopics": ["topic1", "topic2"],
    "questionsToAsk": ["question1", "question2"],
    "areasToStudy": ["area1", "area2"]
  }
}`
        },
        {
          role: "user",
          content: `Please analyze this interview transcript and provide detailed insights.

Context:
${context}

Transcript:
${interview.transcript}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    })

    const analysisText = completion.choices[0]?.message?.content
    if (!analysisText) {
      return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 })
    }

    let analysis
    try {
      analysis = JSON.parse(analysisText)
    } catch {
      console.error("Failed to parse AI response:", analysisText)
      return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 })
    }

    // Extract follow-up steps for separate storage
    const followUpSteps = analysis.followUpSteps || []

    // Update the interview with analysis
    const updatedInterview = await prisma.interview.update({
      where: { id },
      data: {
        aiAnalysis: analysis,
        followUpSteps: followUpSteps,
        analyzedAt: new Date(),
      },
      include: { interviewers: true },
    })

    return NextResponse.json({
      success: true,
      interview: updatedInterview,
      analysis
    })
  } catch (error) {
    console.error("Error analyzing interview:", error)
    return NextResponse.json({ error: "Failed to analyze interview" }, { status: 500 })
  }
}
