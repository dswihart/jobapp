/**
 * AI-powered Skill Extraction and Database Service
 * Extracts skills from job descriptions and builds a skill database
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

interface ExtractedSkill {
  name: string
  category: string
  subcategory?: string
  isRequired: boolean
  proficiencyLevel?: string
  yearsRequired?: number
  aliases?: string[]
}

interface SkillExtractionResult {
  skills: ExtractedSkill[]
  jobTitle: string
  company?: string
}

// Skill categories for normalization
const SKILL_CATEGORIES = {
  'Programming Language': ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB'],
  'Frontend Framework': ['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Remix', 'Astro', 'SolidJS'],
  'Backend Framework': ['Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Rails', 'Laravel', 'ASP.NET'],
  'Database': ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'SQLite', 'Oracle', 'SQL Server'],
  'Cloud Platform': ['AWS', 'Azure', 'GCP', 'Google Cloud', 'DigitalOcean', 'Heroku', 'Vercel', 'Cloudflare'],
  'DevOps': ['Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'ArgoCD'],
  'Security': ['OWASP', 'Penetration Testing', 'SIEM', 'SOC', 'IAM', 'Zero Trust', 'Encryption', 'Compliance', 'DLP', 'SASE'],
  'Data & ML': ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Spark', 'Hadoop', 'Data Engineering'],
  'Soft Skill': ['Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Time Management', 'Agile', 'Scrum', 'Project Management']
}

/**
 * Extract skills from a job description using AI
 */
export async function extractSkillsFromJob(
  jobDescription: string,
  jobTitle: string,
  company?: string,
  requirements?: string
): Promise<SkillExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    // Fallback to keyword-based extraction
    return fallbackSkillExtraction(jobDescription, jobTitle, company, requirements)
  }

  try {
    const anthropic = new Anthropic({ apiKey })

    const prompt = `You are an expert at analyzing job descriptions and extracting technical and soft skills.

Analyze the following job posting and extract ALL skills mentioned or implied.

**Job Title:** ${jobTitle}
**Company:** ${company || 'Not specified'}

**Job Description:**
${jobDescription}

${requirements ? `**Requirements:**\n${requirements}` : ''}

**Task:** Extract all skills and categorize them. Return a JSON object with this structure:

{
  "skills": [
    {
      "name": "Skill Name (properly capitalized, e.g., 'JavaScript' not 'javascript')",
      "category": "One of: Programming Language, Frontend Framework, Backend Framework, Database, Cloud Platform, DevOps, Security, Data & ML, Soft Skill, Tool, Methodology, Domain Knowledge",
      "subcategory": "Optional more specific category (e.g., 'Backend' for Node.js)",
      "isRequired": true/false (based on context - required vs nice-to-have),
      "proficiencyLevel": "If mentioned: Beginner, Intermediate, Advanced, or Expert",
      "yearsRequired": null or number if years of experience mentioned,
      "aliases": ["Alternative names for this skill, e.g., ['JS'] for JavaScript"]
    }
  ]
}

**Guidelines:**
- Extract both explicit skills ("Must know Python") and implicit ones (if they mention "REST APIs", extract both REST and API Design)
- Normalize skill names to their common forms (e.g., "k8s" → "Kubernetes")
- Include soft skills like "communication", "leadership", etc.
- Include methodologies like "Agile", "Scrum", "CI/CD"
- Include domain knowledge like "FinTech", "Healthcare", "E-commerce"
- Don't include job titles or role names as skills
- Be comprehensive but don't duplicate skills

Return ONLY valid JSON, no additional text or markdown.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      temperature: 0.2,
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

    return {
      skills: result.skills || [],
      jobTitle,
      company
    }

  } catch (error) {
    console.error('Error extracting skills with AI:', error)
    return fallbackSkillExtraction(jobDescription, jobTitle, company, requirements)
  }
}

/**
 * Fallback keyword-based skill extraction
 */
function fallbackSkillExtraction(
  jobDescription: string,
  jobTitle: string,
  company?: string,
  requirements?: string
): SkillExtractionResult {
  const text = `${jobDescription} ${requirements || ''}`.toLowerCase()
  const skills: ExtractedSkill[] = []
  const seen = new Set<string>()

  for (const [category, skillList] of Object.entries(SKILL_CATEGORIES)) {
    for (const skill of skillList) {
      const skillLower = skill.toLowerCase()
      if (text.includes(skillLower) && !seen.has(skillLower)) {
        seen.add(skillLower)
        skills.push({
          name: skill,
          category,
          isRequired: true // Assume required in fallback
        })
      }
    }
  }

  return { skills, jobTitle, company }
}

/**
 * Save extracted skills to the database
 */
export async function saveSkillsToDatabase(
  extractionResult: SkillExtractionResult,
  jobUrl?: string
): Promise<{ savedCount: number; updatedCount: number }> {
  let savedCount = 0
  let updatedCount = 0

  for (const skill of extractionResult.skills) {
    const normalizedName = skill.name.toLowerCase().trim()

    try {
      // Try to find existing skill
      const existingSkill = await prisma.skill.findUnique({
        where: { normalizedName }
      })

      if (existingSkill) {
        // Update existing skill - increment frequency and update lastSeenAt
        await prisma.skill.update({
          where: { id: existingSkill.id },
          data: {
            frequency: existingSkill.frequency + 1,
            lastSeenAt: new Date(),
            // Merge aliases
            aliases: Array.from(new Set([...existingSkill.aliases, ...(skill.aliases || [])]))
          }
        })

        // Create job skill record
        await prisma.jobSkill.create({
          data: {
            skillId: existingSkill.id,
            jobTitle: extractionResult.jobTitle,
            company: extractionResult.company,
            jobUrl,
            isRequired: skill.isRequired,
            proficiencyLevel: skill.proficiencyLevel,
            yearsRequired: skill.yearsRequired
          }
        })

        updatedCount++
      } else {
        // Create new skill
        const newSkill = await prisma.skill.create({
          data: {
            name: skill.name,
            normalizedName,
            category: skill.category,
            subcategory: skill.subcategory,
            aliases: skill.aliases || [],
            frequency: 1,
            demandTrend: 'stable'
          }
        })

        // Create job skill record
        await prisma.jobSkill.create({
          data: {
            skillId: newSkill.id,
            jobTitle: extractionResult.jobTitle,
            company: extractionResult.company,
            jobUrl,
            isRequired: skill.isRequired,
            proficiencyLevel: skill.proficiencyLevel,
            yearsRequired: skill.yearsRequired
          }
        })

        savedCount++
      }
    } catch (error) {
      console.error(`Error saving skill ${skill.name}:`, error)
    }
  }

  return { savedCount, updatedCount }
}

/**
 * Get skill statistics and trends
 */
export async function getSkillStats() {
  const [
    totalSkills,
    totalJobSkills,
    topSkills,
    categoryBreakdown,
    recentSkills
  ] = await Promise.all([
    prisma.skill.count(),
    prisma.jobSkill.count(),
    prisma.skill.findMany({
      orderBy: { frequency: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        category: true,
        frequency: true,
        demandTrend: true,
        lastSeenAt: true
      }
    }),
    prisma.skill.groupBy({
      by: ['category'],
      _count: { id: true },
      _sum: { frequency: true }
    }),
    prisma.skill.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        category: true,
        frequency: true,
        lastSeenAt: true
      }
    })
  ])

  return {
    totalSkills,
    totalJobSkills,
    topSkills,
    categoryBreakdown: categoryBreakdown.map(c => ({
      category: c.category,
      count: c._count.id,
      totalFrequency: c._sum.frequency || 0
    })),
    recentSkills
  }
}

/**
 * Search skills by name or category
 */
export async function searchSkills(query: string, category?: string, limit = 50) {
  const where: any = {}

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { normalizedName: { contains: query.toLowerCase() } },
      { aliases: { has: query.toLowerCase() } }
    ]
  }

  if (category) {
    where.category = category
  }

  return prisma.skill.findMany({
    where,
    orderBy: { frequency: 'desc' },
    take: limit,
    include: {
      _count: {
        select: { jobSkills: true }
      }
    }
  })
}

/**
 * Get related skills for a given skill
 */
export async function getRelatedSkills(skillId: string) {
  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
    include: {
      jobSkills: {
        take: 100,
        select: { jobTitle: true }
      }
    }
  })

  if (!skill) return []

  // Find skills that commonly appear in the same job titles
  const jobTitles = skill.jobSkills.map(js => js.jobTitle)

  const relatedSkills = await prisma.skill.findMany({
    where: {
      id: { not: skillId },
      jobSkills: {
        some: {
          jobTitle: { in: jobTitles }
        }
      }
    },
    orderBy: { frequency: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      category: true,
      frequency: true
    }
  })

  return relatedSkills
}

/**
 * Update skill demand trends based on recent activity
 */
export async function updateSkillTrends() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const skills = await prisma.skill.findMany({
    include: {
      jobSkills: {
        select: { extractedAt: true }
      }
    }
  })

  for (const skill of skills) {
    const recentCount = skill.jobSkills.filter(js => js.extractedAt > thirtyDaysAgo).length
    const previousCount = skill.jobSkills.filter(
      js => js.extractedAt > sixtyDaysAgo && js.extractedAt <= thirtyDaysAgo
    ).length

    let trend = 'stable'
    if (previousCount > 0) {
      const changeRatio = recentCount / previousCount
      if (changeRatio > 1.2) trend = 'rising'
      else if (changeRatio < 0.8) trend = 'declining'
    } else if (recentCount > 5) {
      trend = 'rising'
    }

    await prisma.skill.update({
      where: { id: skill.id },
      data: { demandTrend: trend }
    })
  }
}

/**
 * Match user skills against the skill database
 */
export async function matchUserSkills(userSkills: string[]) {
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim())

  const matchedSkills = await prisma.skill.findMany({
    where: {
      OR: [
        { normalizedName: { in: normalizedUserSkills } },
        { aliases: { hasSome: normalizedUserSkills } }
      ]
    },
    include: {
      _count: {
        select: { jobSkills: true }
      }
    }
  })

  // Find skills the user should consider learning
  const topDemandSkills = await prisma.skill.findMany({
    where: {
      NOT: {
        OR: [
          { normalizedName: { in: normalizedUserSkills } },
          { aliases: { hasSome: normalizedUserSkills } }
        ]
      },
      frequency: { gte: 5 }
    },
    orderBy: { frequency: 'desc' },
    take: 10
  })

  return {
    matched: matchedSkills,
    recommended: topDemandSkills
  }
}
