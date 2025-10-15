/**
 * Pattern Learning Service
 * Analyzes rejected jobs to learn user preferences
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface JobOpportunity {
  id: string
  title: string
  company: string
  description: string
  location?: string
  source: string
  fitScore: number
}

interface RejectionPattern {
  userId: string
  patternType: string
  patternValue: string
  frequency: number
}

/**
 * Extract patterns from a rejected job and store them
 */
export async function learnFromRejection(
  userId: string,
  job: JobOpportunity
): Promise<void> {
  const patterns: Array<{ type: string; value: string }> = []

  // 1. Extract title keywords (domain-specific words)
  const titleKeywords = extractTitleKeywords(job.title)
  titleKeywords.forEach(keyword => {
    patterns.push({ type: 'REJECTED_TITLE_KEYWORD', value: keyword })
  })

  // 2. Company pattern
  patterns.push({ type: 'REJECTED_COMPANY', value: job.company })

  // 3. Source pattern (if user consistently rejects from a source)
  patterns.push({ type: 'REJECTED_SOURCE', value: job.source })

  // 4. Location pattern
  if (job.location) {
    patterns.push({ type: 'REJECTED_LOCATION', value: job.location })
  }

  // 5. Low fit score pattern (if rejecting jobs above certain score)
  if (job.fitScore < 50) {
    patterns.push({ type: 'REJECTED_LOW_SCORE', value: `${Math.floor(job.fitScore / 10) * 10}` })
  }

  // Store patterns in database
  await storePatterns(userId, patterns)
}

/**
 * Extract meaningful keywords from job title
 */
function extractTitleKeywords(title: string): string[] {
  const genericWords = new Set([
    'engineer', 'specialist', 'analyst', 'manager', 'developer',
    'consultant', 'senior', 'junior', 'lead', 'principal', 'staff',
    'the', 'a', 'an', 'and', 'or', 'for', 'in', 'at', 'to'
  ])

  const words = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !genericWords.has(w))

  // Return unique keywords
  return [...new Set(words)]
}

/**
 * Store or update patterns in database
 */
async function storePatterns(
  userId: string,
  patterns: Array<{ type: string; value: string }>
): Promise<void> {
  for (const pattern of patterns) {
    await prisma.$executeRaw`
      INSERT INTO rejection_patterns (user_id, pattern_type, pattern_value, frequency, updated_at)
      VALUES (${userId}, ${pattern.type}, ${pattern.value}, 1, NOW())
      ON CONFLICT (user_id, pattern_type, pattern_value)
      DO UPDATE SET
        frequency = rejection_patterns.frequency + 1,
        updated_at = NOW()
    `
  }
}

/**
 * Get learned rejection patterns for a user
 */
export async function getRejectionPatterns(userId: string): Promise<RejectionPattern[]> {
  const result = await prisma.$queryRaw<Array<{
    user_id: string
    pattern_type: string
    pattern_value: string
    frequency: number
  }>>`
    SELECT user_id, pattern_type, pattern_value, frequency
    FROM rejection_patterns
    WHERE user_id = ${userId}
      AND frequency >= 2
    ORDER BY frequency DESC
    LIMIT 50
  `

  return result.map(r => ({
    userId: r.user_id,
    patternType: r.pattern_type,
    patternValue: r.pattern_value,
    frequency: r.frequency
  }))
}

/**
 * Calculate penalty score based on learned patterns
 */
export async function calculateRejectionPenalty(
  userId: string,
  job: JobOpportunity
): Promise<number> {
  const patterns = await getRejectionPatterns(userId)

  if (patterns.length === 0) return 0

  let penaltyScore = 0
  const titleLower = job.title.toLowerCase()
  const locationLower = (job.location || '').toLowerCase()

  for (const pattern of patterns) {
    const weight = Math.min(pattern.frequency / 10, 1.0) // Max weight of 1.0

    switch (pattern.patternType) {
      case 'REJECTED_TITLE_KEYWORD':
        if (titleLower.includes(pattern.patternValue.toLowerCase())) {
          penaltyScore += 15 * weight
        }
        break

      case 'REJECTED_COMPANY':
        if (job.company === pattern.patternValue) {
          penaltyScore += 20 * weight
        }
        break

      case 'REJECTED_SOURCE':
        if (job.source === pattern.patternValue) {
          penaltyScore += 10 * weight
        }
        break

      case 'REJECTED_LOCATION':
        if (locationLower.includes(pattern.patternValue.toLowerCase())) {
          penaltyScore += 12 * weight
        }
        break
    }
  }

  return Math.min(penaltyScore, 50) // Cap at 50 point penalty
}

/**
 * Get rejection statistics for user
 */
export async function getRejectionStats(userId: string): Promise<{
  totalPatterns: number
  topRejectedKeywords: Array<{ keyword: string; count: number }>
  topRejectedCompanies: Array<{ company: string; count: number }>
}> {
  const patterns = await prisma.$queryRaw<Array<{
    pattern_type: string
    pattern_value: string
    frequency: number
  }>>`
    SELECT pattern_type, pattern_value, frequency
    FROM rejection_patterns
    WHERE user_id = ${userId}
    ORDER BY frequency DESC
  `

  const keywords = patterns
    .filter(p => p.pattern_type === 'REJECTED_TITLE_KEYWORD')
    .map(p => ({ keyword: p.pattern_value, count: p.frequency }))
    .slice(0, 10)

  const companies = patterns
    .filter(p => p.pattern_type === 'REJECTED_COMPANY')
    .map(p => ({ company: p.pattern_value, count: p.frequency }))
    .slice(0, 10)

  return {
    totalPatterns: patterns.length,
    topRejectedKeywords: keywords,
    topRejectedCompanies: companies
  }
}
