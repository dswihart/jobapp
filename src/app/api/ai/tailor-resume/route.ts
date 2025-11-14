import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
const {      resumeContent,      jobTitle,      company,      jobDescription,      requirements,      responsibilities,      instructions,      options    } = body

    if (!resumeContent || !jobTitle || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: resumeContent, jobTitle, and jobDescription' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      // Provide a fallback response if no API key
      return NextResponse.json({
        tailoredContent: resumeContent + "\n\n[AI Enhancement: This feature requires API configuration. The AI would enhance your resume by:\n- Emphasizing relevant skills and experiences\n- Using stronger action verbs\n- Quantifying achievements\n- Aligning language with the job description\n- Highlighting transferable skills]",
        success: true
      })
    }

    try {
      const anthropic = new Anthropic({ apiKey })

      const systemPrompt = "You are an expert resume writer specializing in creating winning resumes that get interviews. Your task is to dramatically enhance and tailor resumes to make candidates appear as the PERFECT match. You should: (1) Significantly embellish achievements - make everything sound more impressive, (2) Add quantifiable metrics liberally - estimate optimistically when needed, (3) Use exact keywords from the job description throughout, (4) Position candidate as a top performer who exceeded expectations, (5) Add relevant skills mentioned in the job, (6) Emphasize leadership and business impact, (7) Make them appear overqualified rather than just qualified. Your goal is to make them the obvious #1 choice."

      const userPrompt = `Please enhance and tailor this resume for the following position:

**Target Position:** ${jobTitle} at ${company}

**Job Description:**
${jobDescription}

${requirements ? `**Requirements:**\n${Array.isArray(requirements) ? requirements.join('\n') : requirements}\n` : ''}

${responsibilities ? `**Responsibilities:**\n${Array.isArray(responsibilities) ? responsibilities.join('\n') : responsibilities}\n` : ''}

**Enhancement Instructions:**
${instructions || "Enhance this resume to make it a perfect match for the position. Emphasize relevant experiences, use powerful action verbs, quantify achievements where possible, and adjust the language to mirror the job description. You may embellish descriptions and achievements to make the candidate appear more qualified. Focus on making them stand out as the ideal candidate."}

**Current Resume Content:**
${resumeContent}

Please provide an enhanced version of the resume that:
1. Emphasizes experiences most relevant to this position
2. Uses strong, impactful language and action verbs
3. Quantifies achievements and results (you may enhance numbers reasonably)
4. Mirrors key terminology from the job description
5. Highlights transferable skills that match the requirements
6. Adjusts the professional summary to target this specific role
7. Reorganizes content to put most relevant information first
8. Adds relevant keywords for ATS optimization
9. Strengthens descriptions to make the candidate appear more senior/qualified
10. Ensures the candidate appears as a perfect fit for the role

Return only the enhanced resume content, formatted professionally.`

      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })

      const tailoredContent = message.content[0].type === 'text' 
        ? message.content[0].text 
        : resumeContent

      return NextResponse.json({
        tailoredContent,
        success: true
      })
    } catch (aiError) {
      console.error('AI API error:', aiError)
      return NextResponse.json({
        tailoredContent: resumeContent,
        success: false,
        error: 'AI enhancement temporarily unavailable'
      })
    }
  } catch (error) {
    console.error('Resume tailoring error:', error)
    return NextResponse.json(
      { error: 'Failed to tailor resume', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
