/**
 * Enhanced AI Job Matching Service
 * Uses detailed user profile, LLM, and skill database for better matching
 */

import Anthropic from '@anthropic-ai/sdk'
import * as cheerio from 'cheerio'
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

/**
 * Enhanced AI matching using Claude with skill database integration
 */
export async function analyzeJobFitEnhanced(
  userProfile: EnhancedUserProfile,
  jobDescription: JobDescription,
  userId?: string
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

    // Fetch user preference history if userId provided
    let preferenceSection = ''
    if (userId) {
      const likedJobs = await getRecentLikedJobs(userId)
      if (likedJobs.length > 0) {
        const likedLines = likedJobs.map(j => `- ${j.title} at ${j.company} (scored ${j.fitScore}%)`).join("\n")
        preferenceSection = "\n**User Preference History (jobs the user liked):**\n" + likedLines + "\nUse these as calibration - the user has confirmed these are good matches. Score similar roles and companies higher.\n"
      }
    }

    const prompt = `You are a job matching AI for a cybersecurity professional. Score how well this candidate matches the job posting.

**STEP 1: Determine if this is a security-related role.**
Check the job title AND description for security indicators:
- Title contains: security, cybersecurity, infosec, CISO, SOC, SIEM, DLP, IAM, PAM, compliance, GRC, threat, vulnerability, penetration, forensic, encryption, DevSecOps, SRE, cloud security, data protection, risk, audit
- Description mentions: security responsibilities, compliance frameworks, threat detection, incident response, access control, vulnerability management, security architecture, security tools

**STEP 2: Score based on role domain.**

IF the role IS security-related → Score normally using skills/experience/seniority match. These roles should score 55-95% if skills align.

IF the role is NOT security-related → Apply penalties:
- Pure Cloud/Infrastructure (Cloud Architect, Azure/AWS Consultant, Solutions Architect with no security focus) → overall ≤35
- Pure DevOps (only CI/CD, deployments, no security) → overall ≤35
- Pure Software Engineering/Backend/Frontend → overall ≤25
- Pure Data/ML/AI Engineering → overall ≤25
- Sales/Marketing/HR/Legal/Product/Support → overall ≤15
- Generic IT Operations/Helpdesk → overall ≤25

IMPORTANT: Only score cloud roles high (55+) if they explicitly involve cloud SECURITY (e.g., Cloud Security Engineer, Cloud Security Architect). Generic cloud roles (Cloud Architect, Azure Consultant, Solutions Architect) that focus on infrastructure/migration/design without security responsibilities should be capped at 35.

**STEP 3: Location check.**
- Candidate needs: Remote, Barcelona, Spain, or Europe
- USA-only/Asia-only with no remote option → locationMatch=0, cap overall at 30

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

Return a JSON object:
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
  "trendingSkillsNeeded": ["skills to learn"]
}

**Cybersecurity tool equivalences (treat as interchangeable):**
- SIEM: Splunk ↔ ELK ↔ Sentinel ↔ QRadar ↔ Datadog Security
- EDR/XDR: CrowdStrike ↔ SentinelOne ↔ Carbon Black ↔ Defender ↔ Cortex XDR
- IAM/PAM: CyberArk ↔ Okta ↔ Entra ID ↔ SailPoint ↔ BeyondTrust
- DLP: Purview ↔ Symantec DLP ↔ Digital Guardian ↔ Forcepoint
- Cloud security: AWS Security Hub ↔ Azure Security Center ↔ Prisma Cloud ↔ Wiz
- Vuln mgmt: Qualys ↔ Nessus ↔ Rapid7 ↔ Snyk ↔ Trivy
- Network: Palo Alto ↔ Fortinet ↔ Check Point ↔ WAF (Imperva/Cloudflare)
- GRC frameworks: GDPR ↔ PCI-DSS ↔ HIPAA ↔ SOX ↔ ISO 27001 ↔ NIST ↔ SOC2

**Scoring formula:**
- titleMatch 25% + skillMatch 35% + experienceMatch 15% + seniorityMatch 10% + locationMatch 10% + industryMatch 5%

**IMPORTANT: If the job title clearly indicates a security role (e.g., "Security Engineer", "CyberArk Engineer", "SOC Analyst", "CISO", "DLP Engineer", "Threat Analyst"), give titleMatch 70-100 based on how closely it aligns with candidate's preferred titles. Do NOT score security roles low just because the description is brief.**

Return ONLY valid JSON, no markdown.`

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

/**
 * Extract job details from HTML page using Claude AI
 */
export async function extractJobFromHtml(
  html: string,
  url: string
): Promise<{ title: string; company: string; description: string; requirements?: string; location?: string; salary?: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: 'AI service unavailable' }
  }

  try {
    const $ = cheerio.load(html)
    // Remove script, style, nav, footer, header elements to reduce noise
    $('script, style, nav, footer, header, noscript, iframe').remove()
    let text = $('body').text().replace(/\s+/g, ' ').trim()

    // Truncate to 10k chars to limit token usage
    if (text.length > 10000) {
      text = text.substring(0, 10000)
    }

    if (text.length < 50) {
      return { error: 'Page appears empty or requires JavaScript to render' }
    }

    const anthropic = new Anthropic({ apiKey })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: `Extract job posting details from this page text. The URL is: ${url}

Page text:
${text}

Return ONLY valid JSON with these fields:
{
  "title": "job title",
  "company": "company name",
  "description": "full job description text",
  "requirements": "requirements/qualifications if separate from description, or null",
  "location": "work location or Remote, or null if not mentioned",
  "salary": "salary/compensation if mentioned, or null"
}

If this page does NOT appear to be a job posting, return: {"error": "not_a_job_posting"}

Return ONLY the JSON object, no markdown or explanation.`
      }]
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
      salary: result.salary || undefined
    }
  } catch (error) {
    console.error('[Import] AI extraction error:', error)
    return { error: error instanceof Error ? error.message : 'AI extraction failed' }
  }
}
