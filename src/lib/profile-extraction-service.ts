/**
 * AI-Powered Profile Extraction Service
 * Uses Claude/OpenAI to extract structured profile from CV/Resume
 */

import Anthropic from '@anthropic-ai/sdk'

interface ExtractedProfile {
  // Basic info
  name?: string
  email?: string
  phone?: string
  location?: string
  summary?: string

  // Skills
  primarySkills: string[]
  secondarySkills: string[]
  learningSkills: string[]

  // Experience
  yearsOfExperience?: number
  seniorityLevel?: string
  workHistory: Array<{
    company: string
    role: string
    duration: string
    startDate?: string
    endDate?: string
    achievements: string[]
  }>

  // Education
  education: Array<{
    degree: string
    institution: string
    year?: string
  }>

  // Preferences
  jobTitles: string[]
  industries: string[]
  salaryExpectation?: string
  workPreference?: string
  availability?: string
}

export async function extractProfileFromResume(resumeText: string): Promise<ExtractedProfile> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const anthropic = new Anthropic({ apiKey })

  const prompt = `You are an expert resume parser. Extract structured profile information from the following resume/CV text.

Resume Text:
${resumeText}

Extract and return a JSON object with the following structure:
{
  "name": "Full name of the person",
  "email": "Email address if present",
  "phone": "Phone number if present",
  "location": "City, Country or State",
  "summary": "Professional summary (2-3 sentences about their expertise and career focus)",

  "primarySkills": ["Most important technical skills"],
  "secondarySkills": ["Additional skills mentioned"],
  "learningSkills": ["Skills they are learning or familiar with"],

  "yearsOfExperience": Number (total years of professional experience),
  "seniorityLevel": "Junior/Mid-level/Senior/Lead/Principal/Executive",

  "workHistory": [
    {
      "company": "Company name",
      "role": "Job title",
      "duration": "e.g., 2020-2023 or 3 years",
      "startDate": "2020-01",
      "endDate": "2023-12",
      "achievements": ["Key achievements or responsibilities"]
    }
  ],

  "education": [
    {
      "degree": "Degree type and field",
      "institution": "University/School name",
      "year": "Graduation year"
    }
  ],

  "jobTitles": ["Preferred job titles based on their experience"],
  "industries": ["Industries they have worked in"],
  "salaryExpectation": "If mentioned in resume",
  "workPreference": "Remote/Hybrid/On-site if mentioned",
  "availability": "When they can start if mentioned"
}

Important:
- Extract all information accurately from the resume text
- For skills, categorize them into primary (core expertise), secondary (proficient), and learning (familiar/learning)
- Calculate yearsOfExperience by summing up work history durations
- Determine seniorityLevel based on years of experience and job titles
- For workHistory, extract all positions with their achievements
- Return ONLY valid JSON, no additional text
- If information is not present, use null or empty array []

Return the JSON now:`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      temperature: 0,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response')
    }

    const extracted: ExtractedProfile = JSON.parse(jsonMatch[0])

    // Validate and clean up
    return {
      ...extracted,
      primarySkills: extracted.primarySkills || [],
      secondarySkills: extracted.secondarySkills || [],
      learningSkills: extracted.learningSkills || [],
      workHistory: extracted.workHistory || [],
      education: extracted.education || [],
      jobTitles: extracted.jobTitles || [],
      industries: extracted.industries || []
    }

  } catch (error) {
    console.error('Error extracting profile:', error)
    throw new Error('Failed to extract profile from resume')
  }
}

/**
 * Enhanced job matching with detailed profile
 */
export async function matchJobWithProfile(
  profile: ExtractedProfile,
  job: {
    title: string
    company: string
    description: string
    requirements?: string
  }
): Promise<{
  overall: number
  skillMatch: number
  experienceMatch: number
  seniorityMatch: number
  titleMatch: number
  reasoning: string
  recommendations: string[]
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const anthropic = new Anthropic({ apiKey })

  const prompt = `You are an expert job matching AI. Analyze how well this candidate's profile matches the job posting.

Candidate Profile:
- Primary Skills: ${profile.primarySkills.join(', ')}
- Secondary Skills: ${profile.secondarySkills.join(', ')}
- Years of Experience: ${profile.yearsOfExperience || 'Unknown'}
- Seniority Level: ${profile.seniorityLevel || 'Unknown'}
- Recent Roles: ${profile.workHistory.slice(0, 2).map(w => w.role).join(', ')}
- Preferred Job Titles: ${profile.jobTitles.join(', ')}

Job Posting:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
${job.requirements ? `Requirements: ${job.requirements}` : ''}

Analyze the match and return a JSON object with:
{
  "overall": 0-100 (overall fit score),
  "skillMatch": 0-100 (how well skills match),
  "experienceMatch": 0-100 (years of experience match),
  "seniorityMatch": 0-100 (seniority level match),
  "titleMatch": 0-100 (job title relevance),
  "reasoning": "2-3 sentences explaining the match quality",
  "recommendations": ["Specific advice for the candidate"]
}

Calculate scores based on:
- skillMatch: Percentage of required skills the candidate has
- experienceMatch: How well their years match the requirement
- seniorityMatch: If senior role, candidate should be senior
- titleMatch: How well their past titles align with this role
- overall: Weighted average (skills 40%, experience 25%, seniority 20%, title 15%)

Return ONLY valid JSON:`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response')
    }

    return JSON.parse(jsonMatch[0])

  } catch (error) {
    console.error('Error matching job:', error)
    throw new Error('Failed to match job with profile')
  }
}
