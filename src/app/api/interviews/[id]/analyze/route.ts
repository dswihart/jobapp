import { NextRequest, NextResponse } from "next/server"
import { createLLMClient } from '@/lib/llm-client'
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { buildSharedInterviewContext } from "@/lib/interview-context"
import Anthropic from "@anthropic-ai/sdk"

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

    // Initialize Anthropic client inside the handler
    const anthropic = createLLMClient({
      apiKey: process.env.ANTHROPIC_API_KEY,
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

    // Build context for AI analysis. Phase 4: fold in the wider process context
    // (prior rounds/outcomes, app-scoped roster, shared prep blurb, recent notes)
    // so nextRoundPreparation has real prior-round input. Capped in the helper.
    const interviewerNames = interview.interviewers.map(i => i.name).join(", ")
    const sharedContext = await buildSharedInterviewContext(interview.applicationId, { excludeInterviewId: id })
    const context = `
Company: ${application.company}
Role: ${application.role}
Interview Type: ${interview.interviewType}
Interview Round: ${interview.round}
Stage: ${interview.stage || "Not specified"}
${interviewerNames ? `Interviewers: ${interviewerNames}` : ""}
${interview.preparationNotes ? `Preparation Notes: ${interview.preparationNotes}` : ""}
${sharedContext ? `\nWider interview-process context:\n${sharedContext}` : ""}
    `.trim()

    const systemPrompt = `You are an expert interview coach and career advisor. Analyze interview transcripts to provide actionable insights. Be specific, constructive, and focus on helping the candidate improve and succeed.

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
}

IMPORTANT: Respond ONLY with valid JSON, no additional text or markdown.`

    // Cap the transcript sent to the model. Very large transcripts (e.g. 250k+
    // chars) make the AI call slow enough to exceed the HTTP timeout — the
    // backend still finishes and saves, but the browser shows "Error analyzing
    // transcript". Capping keeps the call fast and cheaper while preserving more
    // than enough content for a thorough analysis.
    const MAX_TRANSCRIPT_CHARS = 60000
    const transcriptForAi =
      interview.transcript.length > MAX_TRANSCRIPT_CHARS
        ? interview.transcript.slice(0, MAX_TRANSCRIPT_CHARS) +
          "\n\n[...transcript truncated for analysis — only the first portion was analyzed...]"
        : interview.transcript

    // Call Anthropic Claude for analysis
    const message = await anthropic.messages.create({
      // Was "claude-sonnet-4-20250514" — that model has been retired and now 404s
      // ("not_found_error"), which surfaced as "Failed to analyze interview".
      // Use the app's standard current model (routed via OpenRouter, Anthropic fallback).
      model: "open:interview",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Please analyze this interview transcript and provide detailed insights.

Context:
${context}

Transcript:
${transcriptForAi}

Remember to respond with ONLY valid JSON matching the schema provided.`
        }
      ],
      system: systemPrompt,
    })

    // Extract text from the response
    const analysisText = message.content[0].type === 'text' ? message.content[0].text : null
    if (!analysisText) {
      return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 })
    }

    let analysis
    try {
      // Clean the response in case there's any markdown formatting
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleanedText)
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
