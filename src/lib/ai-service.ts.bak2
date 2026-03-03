/**
 * Enhanced AI Job Matching Service
 * Uses detailed user profile, LLM, and skill database for better matching
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

// Export basic interfaces for backward compatibility
export interface UserProfile {
  skills: string[]
  secondarySkills?: string[]
  jobTitles?: string[]
  seniorityLevel?: string | null
  experience?: string
  education?: string
  preferredRoles?: string[]
}

export interface JobDescription {
  title: string
  description: string
  requirements?: string
  company?: string
  location?: string
  salary?: string
}

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
  preferredCountries?: string[]
  salaryExpectation?: string
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
  skillDemandInfo?: {
    highDemandMatches: string[]
    trendingSkillsNeeded: string[]
  }
}

/**
 * Get skill demand information from the database
 */
async function getSkillDemandContext(userSkills: string[]): Promise<{
  userSkillsWithDemand: Array<{ name: string; frequency: number; trend: string }>
  topDemandSkills: Array<{ name: string; frequency: number; trend: string }>
}> {
  try {
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim())

    // Get user's skills with their demand data
    const userSkillsData = await prisma.skill.findMany({
      where: {
        OR: [
          { normalizedName: { in: normalizedUserSkills } },
          { aliases: { hasSome: normalizedUserSkills } }
        ]
      },
      select: {
        name: true,
        frequency: true,
        demandTrend: true
      },
      orderBy: { frequency: 'desc' }
    })

    // Get top demand skills overall
    const topDemand = await prisma.skill.findMany({
      where: { frequency: { gte: 3 } },
      orderBy: { frequency: 'desc' },
      take: 20,
      select: {
        name: true,
        frequency: true,
        demandTrend: true
      }
    })

    return {
      userSkillsWithDemand: userSkillsData.map(s => ({
        name: s.name,
        frequency: s.frequency,
        trend: s.demandTrend
      })),
      topDemandSkills: topDemand.map(s => ({
        name: s.name,
        frequency: s.frequency,
        trend: s.demandTrend
      }))
    }
  } catch (error) {
    console.error('Error fetching skill demand context:', error)
    return { userSkillsWithDemand: [], topDemandSkills: [] }
  }
}

/**
 * Enhanced AI matching using Claude with skill database integration
 */
export async function analyzeJobFitEnhanced(
  userProfile: EnhancedUserProfile,
  jobDescription: JobDescription
): Promise<EnhancedFitScore> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return fallbackMatching(userProfile, jobDescription)
  }

  try {
    const anthropic = new Anthropic({ apiKey })

    // Get skill demand context from database
    const allUserSkills = [
      ...userProfile.primarySkills,
      ...userProfile.secondarySkills,
      ...userProfile.learningSkills
    ]
    const skillContext = await getSkillDemandContext(allUserSkills)

    // Build skill demand context for the prompt
    let skillDemandSection = ''
    if (skillContext.userSkillsWithDemand.length > 0) {
      const highDemand = skillContext.userSkillsWithDemand.filter(s => s.frequency >= 5)
      const rising = skillContext.userSkillsWithDemand.filter(s => s.trend === 'rising')

      skillDemandSection = `
**Skill Market Demand (from job database):**
- Candidate's High-Demand Skills: ${highDemand.map(s => `${s.name} (${s.frequency} mentions)`).join(', ') || 'None tracked yet'}
- Candidate's Rising Skills: ${rising.map(s => s.name).join(', ') || 'None'}
- Top In-Demand Skills in Market: ${skillContext.topDemandSkills.slice(0, 10).map(s => s.name).join(', ')}
`
    }

    const prompt = `You are an expert career advisor and job matching AI. Analyze how well this SPECIFIC candidate matches the job posting.

**CRITICAL MATCHING RULES:**
1. The candidate's job titles MUST align with the role (e.g., "Security Engineer" should NOT match "Data Engineer" or "Legal" roles)
   - If job is in DIFFERENT domain than candidate preferred titles → titleMatch ≤25, overall ≤30
3. If the job title/role is completely different from the candidate's preferred titles, the match should be LOW (<40%)
4. **LOCATION IS CRITICAL - STRICT ENFORCEMENT**:
   - Candidate requires: "Remote or Hybrid in Barcelona, Spain"
   - If job location is USA, Egypt, India, Asia, etc. → locationMatch=0, overall must be ≤30
   - ONLY accept: Remote, Barcelona, Spain, or Europe Remote
   - Any violation = immediate disqualification

**Candidate Profile:**
- Primary Skills (Core Expertise): ${userProfile.primarySkills.join(', ')}
- Secondary Skills: ${userProfile.secondarySkills.join(', ')}
- Learning/Familiar: ${userProfile.learningSkills?.join(', ') || 'None'}
- Years of Experience: ${userProfile.yearsOfExperience || 'Unknown'}
- Seniority Level: ${userProfile.seniorityLevel || 'Unknown'}
- Recent Roles: ${userProfile.workHistory?.slice(0, 3).map(w => w.role).join(', ') || 'Not provided'}
- **Preferred Job Titles (MUST MATCH)**: ${userProfile.jobTitles?.join(', ') || 'Any'}
- Target Industries: ${userProfile.industries?.join(', ') || 'Any'}
- **Work Preference (LOCATION CONSTRAINT)**: ${userProfile.workPreference || 'Not specified'}
- **Preferred Countries/Locations (LOCATION FILTER)**: ${userProfile.preferredCountries?.join(", ") || "Any"}
- Professional Summary: ${userProfile.summary || 'Not provided'}
${skillDemandSection}
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
  "matchedSkills": ["Skills from their profile that match the job - be comprehensive"],
  "missingSkills": ["Required skills they don't have or need to improve"],
  "recommendations": ["Specific advice for applying or improving candidacy"],
  "strengths": ["Their key advantages for this role"],
  "concerns": ["Potential weaknesses or gaps to address"],
  "highDemandMatches": ["Which of their matching skills are high-demand in the market"],
  "trendingSkillsNeeded": ["Trending skills from the job they should consider learning"]
}

**Scoring Guidelines:**
- skillMatch: Match required skills with flexibility for transferable abilities (primary=100%, secondary=80%, learning=50%, related/adjacent=70%)
- experienceMatch: Years of experience match (within range=100, ±3 years=85, ±7 years=65, any relevant=45)
- seniorityMatch: Level match with growth consideration (exact=100, one off=85, growth opportunity=75)
- titleMatch: Job title relevance to candidate's background (exact=100, related field=85, adjacent=70, transferable=55, growth=50)
- industryMatch: Industry compatibility (same=100, adjacent=85, transferable=70, new field with relevant skills=55)
- locationMatch: Location compatibility based on preferences
  * 100: Remote/Worldwide OR matches preferredCountries
  * 85: Same region as preferredCountries
  * 70: Offers relocation to preferredCountries
  * 50: Remote option available
  * 30: Different location but role is exceptional fit
  * 0: Non-remote USA/Asia/etc. when candidate needs Europe/Remote
- overall: Balanced scoring emphasizing potential and transferability

**Overall Formula - Emphasize Skills & Growth:**
- Core Capabilities: 55% (skills 40% + experience 15%)
- Role Alignment: 30% (title 20% + seniority 10%)
- Context Fit: 15% (location 10% + industry 5%)

**Matching Philosophy - Be Encouraging:**
- Recognize transferable skills (security→cloud security, backend→fullstack, etc.)
- Value learning trajectory and secondary skills heavily
- Consider career growth and stretch opportunities
- Tech skills are highly transferable (AWS↔Azure, React↔Vue, Python↔Go)
- Don't penalize for keyword mismatches if core skills align
- Focus on "Can they succeed?" not "Perfect keyword match?"
- If someone has 70%+ of core skills, that's a strong match

**Important:**
- Be realistic but encouraging
- Highlight transferable skills
- Consider career growth opportunities
- Note which skills are high-demand in the current market
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

    const result = JSON.parse(jsonMatch[0])

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
      concerns: result.concerns || [],
      skillDemandInfo: {
        highDemandMatches: result.highDemandMatches || [],
        trendingSkillsNeeded: result.trendingSkillsNeeded || []
      }
    }

  } catch (error) {
    console.error('Error with AI matching:', error)
    return fallbackMatching(userProfile, jobDescription)
  }
}

/**
 * Fallback matching if AI unavailable - now with skill database
 */
async function fallbackMatching(
  userProfile: EnhancedUserProfile,
  jobDescription: JobDescription
): Promise<EnhancedFitScore> {
  const jobText = `${jobDescription.title} ${jobDescription.description} ${jobDescription.requirements || ''}`.toLowerCase()

  // Skill matching
  const allSkills = [...userProfile.primarySkills, ...userProfile.secondarySkills, ...userProfile.learningSkills]
  const matchedSkills = allSkills.filter(skill => jobText.includes(skill.toLowerCase()))
  const skillMatch = allSkills.length > 0 ? Math.round((matchedSkills.length / allSkills.length) * 100) : 0

  // Get skill demand info
  const skillContext = await getSkillDemandContext(matchedSkills)
  const highDemandMatches = skillContext.userSkillsWithDemand
    .filter(s => s.frequency >= 5)
    .map(s => s.name)

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
  let titleMatch = 10
  if (userProfile.jobTitles && userProfile.jobTitles.length > 0) {
    for (const preferredTitle of userProfile.jobTitles) {
      const titleLower = preferredTitle.toLowerCase()
      const jobTitleLower = jobDescription.title.toLowerCase()

      if (jobTitleLower.includes(titleLower) || titleLower.includes(jobTitleLower)) {
        titleMatch = 100
        break
      }

      const genericWords = ['engineer', 'specialist', 'analyst', 'manager', 'developer', 'consultant', 'senior', 'junior', 'lead', 'principal']
      const titleWords = titleLower.split(' ').filter(w => w.length > 3 && !genericWords.includes(w))
      const matchedWords = titleWords.filter(word => jobTitleLower.includes(word))

      if (matchedWords.length > 0 && matchedWords.length >= titleWords.length * 0.8) {
        titleMatch = Math.max(titleMatch, 85)
      } else if (matchedWords.length > 0 && matchedWords.length >= titleWords.length * 0.5) {
        titleMatch = Math.max(titleMatch, 50)
      } else {
        const wrongRoles = ['data engineer', 'software engineer', 'devops', 'qa', 'legal', 'sales', 'marketing', 'hr', 'product manager']
        for (const wrongRole of wrongRoles) {
          if (jobTitleLower.includes(wrongRole)) {
            titleMatch = Math.min(titleMatch, 15)
            break
          }
        }
      }
    }
  } else {
    titleMatch = 50
  }

  const overall = Math.round(
    skillMatch * 0.30 +
    experienceMatch * 0.20 +
    seniorityMatch * 0.10 +
    titleMatch * 0.30 +
    50 * 0.05 +
    50 * 0.05
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
    concerns: [],
    skillDemandInfo: {
      highDemandMatches,
      trendingSkillsNeeded: []
    }
  }
}

// Backward compatibility
export async function analyzeJobFit(
  userProfile: {
    skills: string[]
    secondarySkills?: string[]
    jobTitles?: string[]
    seniorityLevel?: string | null
    experience?: string
  },
  jobDescription: JobDescription
): Promise<{ overall: number, skillMatch: number, experienceMatch: number, keywords: string[], matchedSkills: string[], missingSkills: string[], recommendations: string[] }> {
  const enhanced: EnhancedUserProfile = {
    primarySkills: userProfile.skills || [],
    secondarySkills: userProfile.secondarySkills || [],
    learningSkills: [],
    yearsOfExperience: parseInt(userProfile.experience || '0'),
    seniorityLevel: userProfile.seniorityLevel || undefined,
    jobTitles: userProfile.jobTitles || [],
    industries: [],
    summary: undefined,
    workPreference: undefined,
    salaryExpectation: undefined
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
