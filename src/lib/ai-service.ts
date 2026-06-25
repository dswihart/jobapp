/**
 * Enhanced AI Job Matching Service
 * Uses detailed user profile, LLM, and skill database for better matching
 */

import Anthropic from '@anthropic-ai/sdk'
import { createLLMClient } from '@/lib/llm-client'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'
import { prisma } from './prisma'

/**
 * Remove unpaired (lone) UTF-16 surrogate code units. They appear when scraped
 * job text is truncated mid-emoji/character; left in place they make the JSON
 * request body invalid and the LLM call 400s ("no low surrogate in string").
 * Properly-paired emoji and all normal text are left untouched.
 */
function stripLoneSurrogates(s: string): string {
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
}


/**
 * Create MiniMax client using OpenAI-compatible API
 */
function createMiniMaxClient(): OpenAI | null {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) return null
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.minimaxi.chat/v1',
  })
}

function createOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

/**
 * Score a job using MiniMax (parallel to Claude for consensus scoring)
 */
async function scoreFitWithMiniMax(
  prompt: string
): Promise<EnhancedFitScore | null> {
  const client = createMiniMaxClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: 'MiniMax-Text-01',
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: 'user', content: stripLoneSurrogates(prompt) }],
    })

    const text = response.choices[0]?.message?.content
    if (!text) return null

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const result = JSON.parse(jsonMatch[0])
    return {
      overall: Math.min(100, Math.max(0, result.overall ?? 0)),
      skillMatch: Math.min(100, Math.max(0, result.skillMatch ?? 0)),
      experienceMatch: Math.min(100, Math.max(0, result.experienceMatch ?? 0)),
      seniorityMatch: Math.min(100, Math.max(0, result.seniorityMatch ?? 0)),
      titleMatch: Math.min(100, Math.max(0, result.titleMatch ?? 0)),
      industryMatch: Math.min(100, Math.max(0, result.industryMatch ?? 0)),
      locationMatch: Math.min(100, Math.max(0, result.locationMatch ?? 0)),
      reasoning: result.reasoning || '',
      matchedSkills: result.matchedSkills || [],
      missingSkills: result.missingSkills || [],
      recommendations: result.recommendations || [],
      strengths: result.strengths || [],
      concerns: result.concerns || [],
      scoreBreakdown: result.reasoning || '',
      skillDemandInfo: {
        highDemandMatches: result.highDemandMatches || [],
        trendingSkillsNeeded: result.trendingSkillsNeeded || [],
      },
    }
  } catch (err) {
    console.error('[MiniMax] Scoring error:', err)
    return null
  }
}

/**
 * Average two fit scores together (for consensus scoring)
 */
function averageFitScores(a: EnhancedFitScore, b: EnhancedFitScore): EnhancedFitScore {
  const avg = (x: number, y: number) => Math.round((x + y) / 2)
  return {
    overall: avg(a.overall, b.overall),
    skillMatch: avg(a.skillMatch, b.skillMatch),
    experienceMatch: avg(a.experienceMatch, b.experienceMatch),
    seniorityMatch: avg(a.seniorityMatch, b.seniorityMatch),
    titleMatch: avg(a.titleMatch, b.titleMatch),
    industryMatch: avg(a.industryMatch, b.industryMatch),
    locationMatch: avg(a.locationMatch, b.locationMatch),
    reasoning: a.reasoning,
    matchedSkills: [...new Set([...a.matchedSkills, ...b.matchedSkills])],
    missingSkills: [...new Set([...a.missingSkills, ...b.missingSkills])],
    recommendations: a.recommendations,
    strengths: a.strengths,
    concerns: a.concerns,
    scoreBreakdown: a.scoreBreakdown,
    extractedJobSkills: a.extractedJobSkills,
    skillDemandInfo: a.skillDemandInfo,
  }
}

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
  scoreBreakdown: string
  extractedJobSkills?: Array<{
    name: string
    category: string
    isRequired: boolean
  }>
  skillDemandInfo?: {
    highDemandMatches: string[]
    trendingSkillsNeeded: string[]
  }
  // Internal: individual model scores for disagreement tracking
  _claudeScore?: number
  _miniMaxScore?: number
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
 * Get recent GOOD_MATCH jobs to feed into AI prompt as calibration
 */
async function getRecentLikedJobs(userId: string): Promise<Array<{ title: string; company: string; fitScore: number }>> {
  try {
    const result = await prisma.jobOpportunity.findMany({
      where: { userId, userFeedback: 'GOOD_MATCH' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { title: true, company: true, fitScore: true }
    })
    return result.map(r => ({ title: r.title, company: r.company, fitScore: r.fitScore || 0 }))
  } catch (error) {
    console.error('Error fetching liked jobs:', error)
    return []
  }
}



async function getRejectionContext(userId: string): Promise<string> {
  try {
    // Get top rejection reasons
    const reasons = await prisma.$queryRaw<Array<{ pattern_value: string; frequency: number }>>`
      SELECT pattern_value, frequency FROM rejection_patterns
      WHERE user_id = ${userId} AND pattern_type = 'REJECTION_REASON' AND frequency >= 2
      ORDER BY frequency DESC LIMIT 10
    `

    // Get rejected companies (freq >= 2)
    const companies = await prisma.$queryRaw<Array<{ pattern_value: string; frequency: number }>>`
      SELECT pattern_value, frequency FROM rejection_patterns
      WHERE user_id = ${userId} AND pattern_type = 'REJECTED_COMPANY' AND frequency >= 2
      ORDER BY frequency DESC LIMIT 10
    `

    // Get rejected title keywords (freq >= 3 to avoid noise)
    const keywords = await prisma.$queryRaw<Array<{ pattern_value: string; frequency: number }>>`
      SELECT pattern_value, frequency FROM rejection_patterns
      WHERE user_id = ${userId} AND pattern_type = 'REJECTED_TITLE_KEYWORD' AND frequency >= 3
      ORDER BY frequency DESC LIMIT 15
    `

    // Get rejected locations (freq >= 2)
    const locations = await prisma.$queryRaw<Array<{ pattern_value: string; frequency: number }>>`
      SELECT pattern_value, frequency FROM rejection_patterns
      WHERE user_id = ${userId} AND pattern_type = 'REJECTED_LOCATION' AND frequency >= 2
      ORDER BY frequency DESC LIMIT 10
    `

    // Get seniority preferences
    const seniority = await prisma.$queryRaw<Array<{ pattern_value: string; frequency: number }>>`
      SELECT pattern_value, frequency FROM rejection_patterns
      WHERE user_id = ${userId} AND pattern_type = 'REJECTED_SENIORITY' AND frequency >= 1
      ORDER BY frequency DESC
    `

    // Get recent liked jobs with their notes (reasons why they were good)
    const likedWithNotes = await prisma.jobOpportunity.findMany({
      where: { userId, userFeedback: 'GOOD_MATCH' },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { title: true, company: true, location: true, fitScore: true, notes: true }
    })

    const reasonLabels: Record<string, string> = {
      'wrong_location': 'Wrong location / not remote',
      'not_relevant_skills': 'Not relevant to skills',
      'wrong_domain': 'Wrong industry or domain',
      'too_senior': 'Too senior',
      'too_junior': 'Too junior',
      'not_authorized_location': 'Not authorized to work there',
      'already_applied': 'Already applied'
    }

    let section = ''

    if (reasons.length > 0) {
      const reasonLines = reasons.map(r => `  - ${reasonLabels[r.pattern_value] || r.pattern_value} (${r.frequency}x)`).join('\n')
      section += `\n**User Rejection Patterns (reasons jobs were rejected):**\n${reasonLines}\n`
    }

    if (companies.length > 0) {
      section += `- Rejected companies: ${companies.map(c => c.pattern_value).join(', ')}\n`
    }

    if (keywords.length > 0) {
      section += `- Frequently rejected title keywords: ${keywords.map(k => k.pattern_value).join(', ')}\n`
    }

    if (locations.length > 0) {
      section += `- Rejected locations: ${locations.map(l => l.pattern_value).join(', ')}\n`
    }

    if (seniority.length > 0) {
      const seniorityPrefs = seniority.map(s => s.pattern_value === 'too_senior' ? 'Dislikes overly senior roles' : 'Dislikes junior roles').join(', ')
      section += `- Seniority: ${seniorityPrefs}\n`
    }

    if (likedWithNotes.length > 0) {
      const likedLines = likedWithNotes.map(j => {
        let line = `  - ${j.title} at ${j.company}`
        if (j.location) line += ` (${j.location})`
        if (j.notes) line += ` — ${j.notes}`
        return line
      }).join('\n')
      section += `\n**Jobs the user explicitly liked (GOOD_MATCH):**\n${likedLines}\nScore similar roles, companies, locations, and domains HIGHER.\n`
    }

    if (section) {
      section += `\nUSE THIS FEEDBACK: If this job matches rejection patterns (wrong location, wrong domain, rejected company), score it LOW. If it matches liked patterns, score it HIGHER. This feedback is MORE important than generic skill matching.\n`
    }

    return section
  } catch (error) {
    console.error('Error fetching rejection context:', error)
    return ''
  }
}

/**
 * Enhanced AI matching using Claude with skill database integration
 */
export async function analyzeJobFitEnhanced(
  userProfile: EnhancedUserProfile,
  jobDescription: JobDescription,
  userId?: string,
  modelOverride?: string,
  // When set (scan path), request a lean response: full detail only for jobs
  // scoring >= this threshold — output tokens are 5x input price and the
  // verbose fields are discarded for below-threshold jobs anyway
  leanThreshold?: number
): Promise<EnhancedFitScore> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return fallbackMatching(userProfile, jobDescription)
  }

  try {
    const anthropic = createLLMClient({ apiKey })

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

    // Fetch user feedback context (likes + rejections)
    let preferenceSection = ''
    if (userId) {
      preferenceSection = await getRejectionContext(userId)
    }

    const prompt = `You are a job matching AI for a cybersecurity professional. Score how well this candidate matches the job posting.

**STEP 1: Determine if this is a security-related role.**
Check the job title AND description for security indicators:
- Title contains: security, cybersecurity, infosec, CISO, SOC, SIEM, DLP, IAM, PAM, compliance, GRC, threat, vulnerability, penetration, forensic, encryption, cloud security, data protection, risk, audit
- Description mentions: security responsibilities, compliance frameworks, threat detection, incident response, access control, vulnerability management, security architecture, security tools

RULE: If the job TITLE contains "security" in any form (e.g. Security Engineer; Application/Product/Cloud/Offensive/Information Security; AppSec; SOC; CISO; SecOps), the role IS security-related. Treat it as security in Step 2 and do NOT apply any non-security caps below.

DEVSECOPS RULE: A "DevSecOps" title alone does NOT make a role security-related — these are usually pipeline/CI-CD/platform-tooling roles. Treat a DevSecOps role as security-related ONLY if the title also contains "Security" (e.g. "Cloud Security Engineer (DevSecOps)") OR the description centers on security architecture, threat modeling, vulnerability management, GRC/compliance, or detection — not merely "secure pipelines". Otherwise treat it as Pure DevOps in Step 2.

**STEP 2: Score based on role domain.**

IF the role IS security-related → Score normally using skills/experience/seniority match. These roles should score 55-95% if skills align.

IF the role is NOT security-related → Apply penalties:
- Pure Cloud/Infrastructure (Cloud Architect, Azure/AWS Consultant, Solutions Architect with no security focus) → overall ≤35
- Pure DevOps or pure DevSecOps (CI/CD, deployments, pipelines, platform tooling — security is incidental, no security architecture/threat/GRC focus) → overall ≤35
- Pure Software Engineering/Backend/Frontend → overall ≤25
- Pure Data/ML/AI Engineering → overall ≤25
- Sales/Marketing/HR/Legal/Product/Support → overall ≤15
- Generic IT Operations/Helpdesk → overall ≤25

IMPORTANT: Only score cloud roles high (55+) if they explicitly involve cloud SECURITY (e.g., Cloud Security Engineer, Cloud Security Architect). Generic cloud roles (Cloud Architect, Azure Consultant, Solutions Architect) that focus on infrastructure/migration/design without security responsibilities should be capped at 35.

**STEP 3: Location check.**
- Candidate is based in Spain (EU) and works fully remote. Acceptable: fully-remote/worldwide roles, EU-remote roles, or roles in Spain/Barcelona/Europe.
- Fully remote / "Anywhere in the World" / Europe-eligible -> locationMatch 80-100, do NOT cap overall.
- "Remote (US)" or US-time-zone-required -> locationMatch 45, cap overall at 50 (surface strong security matches so the candidate can judge work authorization)
- On-site or hybrid in USA/Asia with no remote option -> locationMatch=0, cap overall at 30

**Candidate Profile:**
- Primary Skills: ${userProfile.primarySkills.join(', ')}
- Secondary Skills: ${userProfile.secondarySkills.join(', ')}
- Learning: ${userProfile.learningSkills?.join(', ') || 'None'}
- Years of Experience: ${userProfile.yearsOfExperience || 'Unknown'}
- Seniority: ${userProfile.seniorityLevel || 'Unknown'}
- Recent Roles: ${userProfile.workHistory?.slice(0, 3).map(w => w.role).join(', ') || 'Not provided'}
- Preferred Titles: ${userProfile.jobTitles?.join(', ') || 'Any'}
- Industries: ${userProfile.industries?.join(', ') || 'Any'}
- Work Preference: ${userProfile.workPreference || 'Not specified'}
- Preferred Locations: ${userProfile.preferredCountries?.join(", ") || "Any"}
- Summary: ${userProfile.summary || 'Not provided'}
${skillDemandSection}${preferenceSection}
**Job Posting:**
Title: ${jobDescription.title}
Company: ${jobDescription.company}
Location: ${jobDescription.location || 'Not specified'}
Salary: ${jobDescription.salary || 'Not specified'}

Description:
${jobDescription.description}

${jobDescription.requirements ? `Requirements:\n${jobDescription.requirements}` : ''}

${leanThreshold !== undefined ? `Return a JSON object:
{
  "overall": 0-100,
  "skillMatch": 0-100,
  "experienceMatch": 0-100,
  "seniorityMatch": 0-100,
  "titleMatch": 0-100,
  "industryMatch": 0-100,
  "locationMatch": 0-100,
  "reasoning": "2-3 sentences",
  "strengths": ["top 2 advantages"],
  "concerns": ["top 2 gaps"],
  "extractedJobSkills": [{"name": "Skill Name", "category": "Category", "isRequired": true}]
}

IMPORTANT: Always compute all seven score fields accurately using the scoring formula. If overall is below ${leanThreshold}, keep the REST of the response minimal — reasoning as ONE short sentence, and strengths, concerns, and extractedJobSkills as empty arrays (skip skill extraction entirely).

For extractedJobSkills (only when overall >= ${leanThreshold}): extract ALL technical and soft skills from the job posting. Categories: Programming Language, Frontend Framework, Backend Framework, Database, Cloud Platform, DevOps, Security, Data & ML, Soft Skill, Tool, Methodology, Domain Knowledge. Normalize names (e.g. "k8s" -> "Kubernetes").` : `Return a JSON object:
{
  "overall": 0-100,
  "skillMatch": 0-100,
  "experienceMatch": 0-100,
  "seniorityMatch": 0-100,
  "titleMatch": 0-100,
  "industryMatch": 0-100,
  "locationMatch": 0-100,
  "reasoning": "2-3 sentences",
  "matchedSkills": ["skills that match"],
  "missingSkills": ["skills they lack"],
  "recommendations": ["advice"],
  "strengths": ["advantages"],
  "concerns": ["gaps"],
  "highDemandMatches": ["high-demand skills"],
  "trendingSkillsNeeded": ["skills to learn"],
  "extractedJobSkills": [{"name": "Skill Name", "category": "Category", "isRequired": true}]
}

For extractedJobSkills: extract ALL technical and soft skills from the job posting. Categories: Programming Language, Frontend Framework, Backend Framework, Database, Cloud Platform, DevOps, Security, Data & ML, Soft Skill, Tool, Methodology, Domain Knowledge. Normalize names (e.g. "k8s" -> "Kubernetes").`}

**Cybersecurity tools are interchangeable within categories** (SIEM, EDR/XDR, IAM/PAM, DLP, Cloud Security, Vuln Mgmt, Network, GRC). Treat equivalent vendor tools as matching skills.

**Scoring formula:**
- titleMatch 25% + skillMatch 35% + experienceMatch 15% + seniorityMatch 10% + locationMatch 10% + industryMatch 5%

**IMPORTANT: If the job title clearly indicates a security role (e.g., "Security Engineer", "CyberArk Engineer", "SOC Analyst", "CISO", "DLP Engineer", "Threat Analyst"), give titleMatch 70-100 based on how closely it aligns with candidate's preferred titles. Do NOT score security roles low just because the description is brief.**

Return ONLY valid JSON, no markdown.`

    // Run Claude and MiniMax in parallel for consensus scoring
    const [message, miniMaxResult] = await Promise.all([
      anthropic.messages.create({
        model: modelOverride || 'claude-haiku-4-5-20251001',
        max_tokens: leanThreshold !== undefined ? 2048 : 4096,
        temperature: 0.3,
        messages: [{ role: 'user', content: stripLoneSurrogates(prompt) }],
      }),
      scoreFitWithMiniMax(prompt).catch(() => null),
    ])

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
    const claudeScore: EnhancedFitScore = {
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
      scoreBreakdown: [
        result.reasoning || '',
        result.strengths?.length ? `Strengths: ${result.strengths.slice(0, 2).join(', ')}.` : '',
        result.concerns?.length ? `Concerns: ${result.concerns.slice(0, 2).join(', ')}.` : '',
      ].filter(Boolean).join(' ').slice(0, 500),
      skillDemandInfo: {
        highDemandMatches: result.highDemandMatches || [],
        trendingSkillsNeeded: result.trendingSkillsNeeded || []
      }
    }

    // Average with MiniMax score if available
    if (miniMaxResult) {
      const averaged = averageFitScores(claudeScore, miniMaxResult)
      averaged._claudeScore = claudeScore.overall
      averaged._miniMaxScore = miniMaxResult.overall
      console.log(`[AI] Consensus: Claude=${claudeScore.overall} MiniMax=${miniMaxResult.overall} Avg=${averaged.overall}`)
      return averaged
    }
    claudeScore._claudeScore = claudeScore.overall
    return claudeScore

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
    scoreBreakdown: `Skill match: ${matchedSkills.length} of ${allSkills.length} skills matched.`,
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

/**
 * Extract job details using MiniMax (primary extractor — 1M context window)
 */
async function extractJobWithMiniMax(
  url: string,
  prompt: string
): Promise<{ title: string; company: string; description: string; requirements?: string; location?: string; salary?: string; employmentType?: string; experienceLevel?: string } | null> {
  const client = createMiniMaxClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: 'MiniMax-Text-01',
      max_tokens: 2048,
      temperature: 0.1,
      messages: [{ role: 'user', content: stripLoneSurrogates(prompt) }],
    })

    const responseText = response.choices[0]?.message?.content
    if (!responseText) return null

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const result = JSON.parse(jsonMatch[0])
    if (result.error || !result.title || !result.company) return null

    return {
      title: result.title,
      company: result.company,
      description: result.description || '',
      requirements: result.requirements || undefined,
      location: result.location || undefined,
      salary: result.salary || undefined,
      employmentType: result.employmentType || undefined,
      experienceLevel: result.experienceLevel || undefined,
    }
  } catch (err) {
    console.error('[MiniMax] Extraction error:', err)
    return null
  }
}

async function extractJobWithOpenAI(
  prompt: string
): Promise<{ title: string; company: string; description: string; requirements?: string; location?: string; salary?: string; employmentType?: string; experienceLevel?: string } | null> {
  const client = createOpenAIClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      max_tokens: 2048,
      temperature: 0.1,
      messages: [{ role: 'user', content: stripLoneSurrogates(prompt) }],
    })

    const responseText = response.choices[0]?.message?.content
    if (!responseText) return null

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const result = JSON.parse(jsonMatch[0])
    if (result.error || !result.title || !result.company) return null

    return {
      title: result.title,
      company: result.company,
      description: result.description || '',
      requirements: result.requirements || undefined,
      location: result.location || undefined,
      salary: result.salary || undefined,
      employmentType: result.employmentType || undefined,
      experienceLevel: result.experienceLevel || undefined,
    }
  } catch (err) {
    console.error('[OpenAI] Extraction error:', err)
    return null
  }
}

/**
 * Extract job details from HTML page using Claude AI
 */
export async function extractJobFromHtml(
  html: string,
  url: string
): Promise<{ title: string; company: string; description: string; requirements?: string; location?: string; salary?: string; employmentType?: string; experienceLevel?: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: 'AI service unavailable' }
  }

  try {
    const $ = cheerio.load(html)
    // Remove script, style, nav, footer, header elements to reduce noise
    $('script, style, nav, footer, header, noscript, iframe').remove()
    let text = $('body').text().replace(/\s+/g, ' ').trim()

    // Truncate to 20k chars to capture more job detail
    if (text.length > 20000) {
      text = text.substring(0, 20000)
    }

    if (text.length < 300) {
      return { error: 'Page appears empty or requires JavaScript to render' }
    }

    const extractPrompt = `Extract job posting details from this page text. The URL is: ${url}

Page text:
${text}

Return ONLY valid JSON with these fields:
{
  "title": "job title",
  "company": "company name",
  "description": "full job description text",
  "requirements": "requirements/qualifications and skills list",
  "location": "work location or Remote or Hybrid, or null if not mentioned",
  "salary": "salary range or compensation package if mentioned, or null",
  "employmentType": "Full-time, Part-time, Contract, Freelance, Internship — exactly one, or null",
  "experienceLevel": "Junior, Mid-level, Senior, Lead, Manager, Director — exactly one, or null"
}

If this page does NOT appear to be a job posting, return: {"error": "not_a_job_posting"}

Return ONLY the JSON object, no markdown or explanation.`

    // Try MiniMax first, then OpenAI, then fall back to Claude Sonnet
    const miniMaxExtracted = await extractJobWithMiniMax(url, extractPrompt)
    if (miniMaxExtracted) {
      console.log('[Import] Extracted via MiniMax')
      return miniMaxExtracted
    }

    const openAIExtracted = await extractJobWithOpenAI(extractPrompt)
    if (openAIExtracted) {
      console.log('[Import] Extracted via OpenAI')
      return openAIExtracted
    }

    console.log('[Import] MiniMax/OpenAI unavailable, falling back to Claude Sonnet')
    const anthropic = createLLMClient({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      temperature: 0.1,
      messages: [{ role: 'user', content: stripLoneSurrogates(extractPrompt) }],
    })

    const responseText = message.content[0]
    if (responseText.type !== 'text') {
      return { error: 'Unexpected AI response type' }
    }

    const jsonMatch = responseText.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { error: 'Failed to parse AI response' }
    }

    const result = JSON.parse(jsonMatch[0])

    if (result.error) {
      return { error: result.error }
    }

    if (!result.title || !result.company) {
      return { error: 'Could not extract job title or company from page' }
    }

    return {
      title: result.title,
      company: result.company,
      description: result.description || '',
      requirements: result.requirements || undefined,
      location: result.location || undefined,
      salary: result.salary || undefined,
      employmentType: result.employmentType || undefined,
      experienceLevel: result.experienceLevel || undefined,
    }
  } catch (error) {
    console.error('[Import] AI extraction error:', error)
    return { error: error instanceof Error ? error.message : 'AI extraction failed' }
  }
}

export async function extractJobFromText(
  text: string,
  url: string
): Promise<{ title: string; company: string; description: string; requirements?: string; location?: string; salary?: string; employmentType?: string; experienceLevel?: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: 'AI service unavailable' }
  }

  try {
    let trimmedText = text.replace(/\s+/g, ' ').trim()
    if (trimmedText.length > 20000) {
      trimmedText = trimmedText.substring(0, 20000)
    }

    if (trimmedText.length < 300) {
      return { error: 'Page content too short - the job posting may require login or is no longer available' }
    }

    const extractPrompt = `Extract job posting details from this page text. The URL is: ${url}

Page text:
${trimmedText}

Return ONLY valid JSON with these fields:
{
  "title": "job title",
  "company": "company name",
  "description": "full job description text",
  "requirements": "requirements/qualifications and skills list",
  "location": "work location or Remote or Hybrid, or null if not mentioned",
  "salary": "salary range or compensation package if mentioned, or null",
  "employmentType": "Full-time, Part-time, Contract, Freelance, Internship — exactly one, or null",
  "experienceLevel": "Junior, Mid-level, Senior, Lead, Manager, Director — exactly one, or null"
}

If this page does NOT appear to be a job posting (e.g. login page, error page, generic company page), return: {"error": "not_a_job_posting"}

Return ONLY the JSON object, no markdown or explanation.`

    // Try MiniMax first, then OpenAI, then fall back to Claude Sonnet
    const miniMaxExtracted = await extractJobWithMiniMax(url, extractPrompt)
    if (miniMaxExtracted) {
      console.log('[Import] Extracted via MiniMax')
      return miniMaxExtracted
    }

    const openAIExtracted = await extractJobWithOpenAI(extractPrompt)
    if (openAIExtracted) {
      console.log('[Import] Extracted via OpenAI')
      return openAIExtracted
    }

    console.log('[Import] MiniMax/OpenAI unavailable, falling back to Claude Sonnet')
    const anthropic = createLLMClient({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      temperature: 0.1,
      messages: [{ role: 'user', content: stripLoneSurrogates(extractPrompt) }],
    })

    const responseText = message.content[0]
    if (responseText.type !== 'text') {
      return { error: 'Unexpected AI response type' }
    }

    const jsonMatch = responseText.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { error: 'Failed to parse AI response' }
    }

    const result = JSON.parse(jsonMatch[0])

    if (result.error) {
      return { error: result.error === 'not_a_job_posting' ? 'Page does not contain a job posting (may require login)' : result.error }
    }

    if (!result.title || !result.company) {
      return { error: 'Could not extract job title or company from page' }
    }

    return {
      title: result.title,
      company: result.company,
      description: result.description || '',
      requirements: result.requirements || undefined,
      location: result.location || undefined,
      salary: result.salary || undefined
    }
  } catch (error) {
    console.error('[Import] AI text extraction error:', error)
    return { error: error instanceof Error ? error.message : 'AI extraction failed' }
  }
}
