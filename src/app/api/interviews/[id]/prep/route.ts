import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createLLMClient } from "@/lib/llm-client"

// POST /api/interviews/[id]/prep — opt-in AI interview prep. Cached in
// interview.prepBrief; pass { regenerate: true } to force a refresh. Routes
// through the cheap open model (open:interview -> Qwen, Anthropic fallback) and
// degrades gracefully (returns an error the UI surfaces) if AI is unavailable.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const regenerate = Boolean(body?.regenerate)

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { application: { select: { userId: true, company: true, role: true, jobUrl: true } } },
    })
    if (!interview || interview.application?.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (interview.prepBrief && !regenerate) {
      return NextResponse.json({ prepBrief: interview.prepBrief, cached: true })
    }

    const company = interview.application?.company || "the company"
    const role = interview.application?.role || "the role"

    const prompt = `You are an expert interview coach for a cybersecurity job seeker.
They have a ${interview.interviewType} interview (round ${interview.round}) for the role "${role}" at "${company}".
Produce concise, specific, practical prep. Return ONLY valid JSON with this exact shape:
{
  "companyBrief": "2-3 sentences on the company and what this role likely focuses on",
  "likelyQuestions": ["6-8 likely interview questions for THIS role and round"],
  "talkingPoints": ["4-6 strengths / talking points the candidate should land"],
  "questionsToAsk": ["4-5 strong questions for the candidate to ask the interviewer"]
}
No markdown, JSON only.`

    const anthropic = createLLMClient({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: "open:interview",
      max_tokens: 1500,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    })

    const text =
      message.content && message.content[0] && message.content[0].type === "text" ? message.content[0].text : ""
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: "Could not generate prep — try again" }, { status: 502 })
    }
    let prepBrief: unknown
    try {
      prepBrief = JSON.parse(match[0])
    } catch {
      return NextResponse.json({ error: "Could not parse prep — try again" }, { status: 502 })
    }

    await prisma.interview.update({ where: { id }, data: { prepBrief: prepBrief as object } })
    return NextResponse.json({ prepBrief, cached: false })
  } catch (error) {
    console.error("Error generating interview prep:", error)
    return NextResponse.json({ error: "Failed to generate prep" }, { status: 500 })
  }
}
