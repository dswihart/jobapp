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

      const systemPrompt = "You are an expert resume writer specializing in creating highly competitive resumes that win job offers. Your primary goal is to transform the candidate's resume to perfectly align with the target job description. You should: (1) Analyze the job requirements deeply and reframe the candidate's experience to match each requirement precisely, (2) Enhance achievements with impressive quantifiable metrics - if the resume lacks numbers, add realistic ones based on typical industry standards for their role, (3) Strategically use EXACT keywords and phrases from the job description throughout the resume, (4) Expand on vague experiences to demonstrate mastery of skills mentioned in the job posting, (5) Rewrite bullet points to emphasize leadership, strategic impact, and business results that align with what the job seeks, (6) Add relevant technical skills and tools from the job description if they're related to what the candidate has done, (7) Transform accomplishments to show progression and expertise at the level the job requires, (8) Make the candidate appear as an exceptional match who checks every box in the job requirements. Focus on making this resume the PERFECT fit for this specific job."

      const userPrompt = `Transform this resume to be the ideal match for the following position:

**Target Position:** ${jobTitle} at ${company}

**Job Description:**
${jobDescription}

${requirements ? `**Requirements:**\n${Array.isArray(requirements) ? requirements.join('\n') : requirements}\n` : ''}

${responsibilities ? `**Responsibilities:**\n${Array.isArray(responsibilities) ? responsibilities.join('\n') : responsibilities}\n` : ''}

**Enhancement Strategy:**
${instructions || "Transform this resume to perfectly match the job requirements. Analyze each requirement and responsibility in the job posting, then rewrite the resume to demonstrate clear expertise in those exact areas. Use the job description's language and keywords extensively. Enhance achievements with strong metrics. Expand experiences to show mastery of the required skills. Make this candidate appear as the ideal match who exceeds expectations for this specific role."}

**Current Resume Content:**
${resumeContent}

Please transform this resume to create the perfect candidate profile for this job:

1. **Deep Job Analysis**: Study every requirement, responsibility, and qualification mentioned in the job posting
2. **Strategic Keyword Integration**: Use exact phrases and terminology from the job description throughout the resume
3. **Experience Reframing**: Rewrite each role to emphasize aspects that directly match job requirements
4. **Quantified Impact**: Add strong metrics to achievements (percentages, dollar amounts, team sizes, etc.) - use industry-standard impressive numbers if originals are vague
5. **Skills Alignment**: Include all technical skills, tools, and methodologies mentioned in the job description where relevant
6. **Leadership & Impact**: Position experiences to show strategic thinking and business impact at the level this job requires
7. **Professional Summary**: Craft a summary that reads like it was written specifically for this exact position
8. **Perfect Match Positioning**: Ensure that for each major job requirement, there's clear evidence in the resume demonstrating that capability
9. **ATS Optimization**: Integrate keywords naturally throughout for maximum ATS score
10. **Competitive Edge**: Transform this into a resume that makes the candidate appear as a top-tier match who brings exactly what they're looking for

The goal is to make the hiring manager think "This person is EXACTLY what we need" when they read it.

Return only the enhanced resume content, formatted professionally.`

      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.8,
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
