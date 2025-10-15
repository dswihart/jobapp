/**
 * Cover Letter Generation Service
 * Uses Claude AI to generate personalized cover letters
 */

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface CoverLetterInput {
  jobTitle: string
  company: string
  jobDescription: string
  userProfile: {
    name: string
    email: string
    yearsOfExperience: number
    primarySkills: string[]
    workHistory?: string
  }
}

/**
 * Generate a personalized cover letter using Claude
 */
export async function generateCoverLetter(input: CoverLetterInput): Promise<string> {
  const { jobTitle, company, jobDescription, userProfile } = input

  const prompt = `Generate a professional, personalized cover letter for the following job application.

Job Details:
- Position: ${jobTitle}
- Company: ${company}
- Description: ${jobDescription}

Candidate Profile:
- Name: ${userProfile.name}
- Email: ${userProfile.email}
- Years of Experience: ${userProfile.yearsOfExperience}
- Key Skills: ${userProfile.primarySkills.join(', ')}
${userProfile.workHistory ? `- Work History: ${userProfile.workHistory}` : ''}

Requirements:
1. Address to the hiring manager (use generic greeting if name not provided)
2. Strong opening that captures attention
3. Highlight relevant experience and skills that match the job
4. Show enthusiasm for the company and role
5. Professional tone, concise (250-350 words)
6. Include contact information in signature
7. Use proper business letter format

Generate ONLY the cover letter text, no additional commentary.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    if (message.content[0].type === 'text') {
      return message.content[0].text
    }

    throw new Error('Unexpected response format from Claude')
  } catch (error) {
    console.error('Error generating cover letter:', error)
    throw new Error(`Failed to generate cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
