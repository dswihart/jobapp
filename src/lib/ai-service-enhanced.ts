/**
 * Enhanced AI Job Matching Service
 * Uses detailed user profile and LLM for better matching
 */

import Anthropic from '@anthropic-ai/sdk'

interface EnhancedUserProfile {
  primarySkills: string[]
  secondarySkills: string[]
  learningSkills: string[]
  yearsOfExperience?: number
  seniorityLevel?: string
  workHistory?: Array<{
    company: string
    role: string
    duration: string
    achievements: string[]
  }>
  jobTitles?: string[]
  industries?: string[]
  summary?: string
  workPreference?: string
  salaryExpectation?: string
}

interface JobDescription {
  title: string
  company: string
  description: string
  requirements?: string
  location?: string
  salary?: string
}

interface EnhancedFitScore {
  overall: number
  skillMatch: number
  experienceMatch: number
  seniorityMatch: number
  titleMatch: number
  industryMatch: number
  locationMatch: number
  reasoning: string
  matchedSkills: string[]
  missingSkills: string[]
  recommendations: string[]
  strengths: string[]
  concerns: string[]
}

/**
 * Enhanced AI matching using Claude
 */
export async function analyzeJobFitEnhanced(
  userProfile: EnhancedUserProfile,
  jobDescription: JobDescription
): Promise<EnhancedFitScore> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    // Fallback to basic matching if no API key
    return fallbackMatching(userProfile, jobDescription)
  }

  try {
    const anthropic = new Anthropic({ apiKey })

    const prompt = `You are an expert career advisor and job matching AI. Analyze how well this candidate matches the job posting.

**Candidate Profile:**
- Primary Skills (Core Expertise): ${userProfile.primarySkills.join(', ')}
- Secondary Skills: ${userProfile.secondarySkills.join(', ')}
- Learning/Familiar: ${userProfile.learningSkills?.join(', ') || 'None'}
- Years of Experience: ${userProfile.yearsOfExperience || 'Unknown'}
- Seniority Level: ${userProfile.seniorityLevel || 'Unknown'}
- Recent Roles: ${userProfile.workHistory?.slice(0, 3).map(w => w.role).join(', ') || 'Not provided'}
- Preferred Job Titles: ${userProfile.jobTitles?.join(', ') || 'Any'}
- Target Industries: ${userProfile.industries?.join(', ') || 'Any'}
- Work Preference: ${userProfile.workPreference || 'Not specified'}
- Professional Summary: ${userProfile.summary || 'Not provided'}

**Job Posting:**
Title: ${jobDescription.title}
Company: ${jobDescription.company}
Location: ${jobDescription.location || 'Not specified'}
Salary: ${jobDescription.salary || 'Not specified'}

Description:
${jobDescription.description}

${jobDescription.requirements ? `Requirements:\n${jobDescription.requirements}` : ''}

**Analysis Task:**
Provide a comprehensive match analysis as a JSON object with this exact structure:
{
  "overall": 0-100,
  "skillMatch": 0-100,
  "experienceMatch": 0-100,
  "seniorityMatch": 0-100,
  "titleMatch": 0-100,
  "industryMatch": 0-100,
  "locationMatch": 0-100,
  "reasoning": "2-3 sentences explaining the overall match quality",
  "matchedSkills": ["Skills from their profile that match the job"],
  "missingSkills": ["Required skills they don't have or need to improve"],
  "recommendations": ["Specific advice for applying or improving candidacy"],
  "strengths": ["Their key advantages for this role"],
  "concerns": ["Potential weaknesses or gaps to address"]
}

**Scoring Guidelines:**
- skillMatch: % of required skills the candidate has (primary=100%, secondary=75%, learning=25%)
- experienceMatch: How years match requirement (exact match=100, ±2 years=80, ±5 years=50)
- seniorityMatch: Does their level match the role level (exact=100, one level off=70, two+=40)
- titleMatch: How similar are their past titles to this role (100=perfect, 70=related, 40=transferable)
- industryMatch: Industry alignment (100=same, 80=similar, 50=transferable, 20=different)
- locationMatch: Location preference vs job location (100=match, 50=possible, 0=mismatch)
- overall: Weighted average: skills(35%), experience(25%), seniority(15%), title(15%), industry(5%), location(5%)

**Important:**
- Be realistic but encouraging
- Highlight transferable skills
- Consider career growth opportunities
- Return ONLY valid JSON, no markdown or extra text`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response')
    }

    const result: EnhancedFitScore = JSON.parse(jsonMatch[0])

    // Validate and ensure all fields present
    return {
      overall: Math.min(100, Math.max(0, result.overall)),
      skillMatch: Math.min(100, Math.max(0, result.skillMatch)),
      experienceMatch: Math.min(100, Math.max(0, result.experienceMatch)),
      seniorityMatch: Math.min(100, Math.max(0, result.seniorityMatch)),
      titleMatch: Math.min(100, Math.max(0, result.titleMatch)),
      industryMatch: Math.min(100, Math.max(0, result.industryMatch)),
      locationMatch: Math.min(100, Math.max(0, result.locationMatch)),
      reasoning: result.reasoning || 'Match analysis completed',
      matchedSkills: result.matchedSkills || [],
      missingSkills: result.missingSkills || [],
      recommendations: result.recommendations || [],
      strengths: result.strengths || [],
      concerns: result.concerns || []
    }

  } catch (error) {
    console.error('Error with AI matching:', error)
    return fallbackMatching(userProfile, jobDescription)
  }
}

/**
 * Fallback matching if AI unavailable
 */
function fallbackMatching(
  userProfile: EnhancedUserProfile,
  jobDescription: JobDescription
): EnhancedFitScore {
  const jobText = `${jobDescription.title} ${jobDescription.description} ${jobDescription.requirements || ''}`.toLowerCase()

  // Skill matching
  const allSkills = [...userProfile.primarySkills, ...userProfile.secondarySkills, ...userProfile.learningSkills]
  const matchedSkills = allSkills.filter(skill => jobText.includes(skill.toLowerCase()))
  const skillMatch = allSkills.length > 0 ? Math.round((matchedSkills.length / allSkills.length) * 100) : 0

  // Experience matching
  const experienceMatch = userProfile.yearsOfExperience ? Math.min(100, userProfile.yearsOfExperience * 10) : 50

  // Simple seniority matching
  let seniorityMatch = 50
  if (userProfile.seniorityLevel) {
    const isSeniorRole = jobText.includes('senior') || jobText.includes('lead') || jobText.includes('principal')
    const isSeniorCandidate = ['Senior', 'Lead', 'Principal'].includes(userProfile.seniorityLevel)
    seniorityMatch = (isSeniorRole === isSeniorCandidate) ? 100 : 60
  }

  // Title matching
  const titleMatch = userProfile.jobTitles?.some(title =>
    jobText.includes(title.toLowerCase())
  ) ? 80 : 50

  // Overall weighted
  const overall = Math.round(
    skillMatch * 0.35 +
    experienceMatch * 0.25 +
    seniorityMatch * 0.15 +
    titleMatch * 0.15 +
    70 * 0.05 + // industry
    70 * 0.05   // location
  )

  return {
    overall: Math.min(100, overall),
    skillMatch,
    experienceMatch,
    seniorityMatch,
    titleMatch,
    industryMatch: 70,
    locationMatch: 70,
    reasoning: `Match based on ${matchedSkills.length} matching skills and ${userProfile.yearsOfExperience || 0} years of experience.`,
    matchedSkills,
    missingSkills: [],
    recommendations: ['Review the job requirements carefully', 'Highlight your matching skills in your application'],
    strengths: matchedSkills.slice(0, 3),
    concerns: []
  }
}

// Backward compatibility - keep old interface working
export async function analyzeJobFit(
  userProfile: { skills: string[], experience?: string },
  jobDescription: JobDescription
): Promise<{ overall: number, skillMatch: number, experienceMatch: number, keywords: string[], matchedSkills: string[], missingSkills: string[], recommendations: string[] }> {
  // Convert to enhanced profile
  const enhanced: EnhancedUserProfile = {
    primarySkills: userProfile.skills,
    secondarySkills: [],
    learningSkills: [],
    yearsOfExperience: parseInt(userProfile.experience || '0'),
    seniorityLevel: undefined
  }

  const result = await analyzeJobFitEnhanced(enhanced, jobDescription)

  return {
    overall: result.overall,
    skillMatch: result.skillMatch,
    experienceMatch: result.experienceMatch,
    keywords: [],
    matchedSkills: result.matchedSkills,
    missingSkills: result.missingSkills,
    recommendations: result.recommendations
  }
}
