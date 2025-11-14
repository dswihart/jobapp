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
- skillMatch: Match required skills considering transferable abilities (primary skills=100%, secondary=80%, learning=40%, related skills=60%)
- experienceMatch: Years of experience fit (within range=100, ±3 years=80, ±7 years=60, any relevant experience=40)
- seniorityMatch: Level alignment, considering growth opportunities (exact=100, one level off=85, growth role=70)
- titleMatch: Past titles vs this role (exact=100, related field=80, transferable=60, growth opportunity=50)
- industryMatch: Industry alignment (same=100, adjacent=85, transferable=70, new but relevant skills=50)
- locationMatch: Location compatibility (preferred location=100, remote=100, acceptable location=80, relocatable=60)
- overall: Balanced formula emphasizing fit and growth potential

**Overall Score Calculation:**
Use this weighted formula but be generous with transferable skills and growth potential:
- Skills & Experience: 50% (emphasize transferable skills, related technologies, and learning ability)
- Role Fit: 30% (title similarity, seniority match, considering career growth)
- Location & Industry: 20% (location compatibility, industry transferability)

**Important Matching Philosophy:**
- Be encouraging and recognize transferable skills (e.g., "software security" → "cloud security")
- Value adjacent experience and learning potential
- Consider career growth opportunities (junior → mid, mid → senior transitions)
- Tech skills are often transferable (AWS → Azure, React → Vue, etc.)
- Give credit for demonstrated learning ability and secondary skills
- Remote jobs should score high for location match
- Barcelona/Spain locations should score high for European candidates
- Don't penalize for exact title mismatches if skills align
- Focus on "can they do the job?" not "do they have exact keywords?"

- Return ONLY valid JSON, no markdown or extra text`

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
