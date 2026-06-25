/**
 * Pattern Learning Service
 * Analyzes rejected jobs to learn user preferences
 */

import { prisma } from './prisma'

// Domain keywords central to the target field (cybersecurity / cloud / infra).
// Never treat these as rejection signals -- not when learning, not when penalizing.
// Stops a learned keyword like "software"/"devops"/"cloud" from nuking a legitimate
// role such as "Offensive Security Software Engineer".
const PROTECTED_DOMAIN_KEYWORDS = new Set([
  'security', 'cyber', 'cybersecurity', 'infosec', 'soc', 'siem', 'soar', 'edr', 'xdr',
  'iam', 'pam', 'dlp', 'grc', 'compliance', 'risk', 'audit', 'threat', 'vulnerability',
  'penetration', 'pentest', 'offensive', 'defensive', 'detection', 'incident', 'response',
  'forensic', 'forensics', 'encryption', 'identity', 'access', 'devsecops', 'appsec',
  'cloud', 'network', 'infrastructure', 'software', 'systems', 'platform', 'devops', 'sre',
  'architect', 'architecture', 'seguridad', 'ciberseguridad', 'arquitectura', 'cumplimiento',
  'cicd', 'ci', 'cd', 'remoto', 'europe', 'european', 'emea', 'global', 'home'
])

const HIGH_IMPORTANCE_LOCATION_REASONS = new Set([
  'wrong_location',
  'not_authorized_location',
])

// Languages we may learn to avoid when the user flags "wrong language".
// English is never learned (the user's working language).
const LANGUAGE_SYNONYMS: Record<string, string[]> = {
  german: ['german', 'deutsch'],
  french: ['french', 'français', 'francais'],
  dutch: ['dutch', 'nederlands'],
  italian: ['italian', 'italiano'],
  portuguese: ['portuguese', 'português', 'portugues'],
  spanish: ['spanish', 'español', 'espanol', 'castellano'],
  catalan: ['catalan', 'català', 'catala'],
  polish: ['polish', 'polski'],
  swedish: ['swedish'], danish: ['danish'], norwegian: ['norwegian'],
  finnish: ['finnish'], czech: ['czech'], romanian: ['romanian'],
  greek: ['greek'], turkish: ['turkish'], russian: ['russian'],
  japanese: ['japanese'], chinese: ['chinese', 'mandarin'], korean: ['korean'], arabic: ['arabic'],
}
const LANGUAGE_REQ_CONTEXT = /(fluent|native|proficien|mandatory|required|must speak|speak|speaking|bilingual|language|verhandlungssicher|muttersprach|fließend|fliessend|courant|madrelingua|\bc1\b|\bc2\b|\bb2\b)/

// Find languages that the job text requires (name + a requirement-context word nearby).
function detectRequiredLanguages(text: string): string[] {
  const t = text.toLowerCase()
  const found = new Set<string>()
  for (const [canonical, forms] of Object.entries(LANGUAGE_SYNONYMS)) {
    for (const form of forms) {
      const idx = t.indexOf(form)
      if (idx === -1) continue
      const window = t.slice(Math.max(0, idx - 60), idx + form.length + 60)
      if (LANGUAGE_REQ_CONTEXT.test(window)) { found.add(canonical); break }
    }
  }
  return [...found]
}


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
  job: JobOpportunity,
  reasons?: string[],
  customNote?: string
): Promise<void> {
  const patterns: Array<{ type: string; value: string }> = []

  // 1. Store explicit rejection reasons (user-selected)
  if (reasons && reasons.length > 0) {
    for (const reason of reasons) {
      patterns.push({ type: 'REJECTION_REASON', value: reason })
    }

    // Only learn location patterns if user flagged location as the issue
    if (reasons.includes('wrong_location') && job.location) {
      patterns.push({ type: 'REJECTED_LOCATION', value: job.location })
    }

    // Learn company pattern if user flagged wrong domain (likely includes company dislike)
    if (reasons.includes('wrong_domain')) {
      patterns.push({ type: 'REJECTED_COMPANY', value: job.company })
    }

    // Learn domain/skill patterns from title if user flagged relevance
    if (reasons.includes('not_relevant_skills') || reasons.includes('wrong_domain')) {
      const titleKeywords = extractTitleKeywords(job.title)
      titleKeywords.forEach(keyword => {
        patterns.push({ type: 'REJECTED_TITLE_KEYWORD', value: keyword })
      })
    }

    // Store seniority preference
    if (reasons.includes('too_senior')) {
      patterns.push({ type: 'REJECTED_SENIORITY', value: 'too_senior' })
      // Learn senior-indicating title words
      const seniorWords = job.title.toLowerCase().match(/\b(director|vp|head|principal|staff|distinguished)\b/g)
      if (seniorWords) {
        seniorWords.forEach(w => patterns.push({ type: 'REJECTED_TITLE_KEYWORD', value: w }))
      }
    }
    if (reasons.includes('too_junior')) {
      patterns.push({ type: 'REJECTED_SENIORITY', value: 'too_junior' })
      const juniorWords = job.title.toLowerCase().match(/\b(intern|junior|entry|associate|trainee|graduate)\b/g)
      if (juniorWords) {
        juniorWords.forEach(w => patterns.push({ type: 'REJECTED_TITLE_KEYWORD', value: w }))
      }
    }

    // Learn the specific language(s) the rejected role required so similar
    // foreign-language postings get penalized on future scans.
    if (reasons.includes('wrong_language')) {
      const langs = detectRequiredLanguages(`${job.title} ${job.description || ''}`)
      if (langs.length > 0) {
        langs.forEach(l => patterns.push({ type: 'REJECTED_LANGUAGE', value: l }))
      } else {
        patterns.push({ type: 'REJECTED_LANGUAGE', value: 'non_english' })
      }
    }
  } else {
    // Fallback: no explicit reasons — use legacy auto-extraction
    const titleKeywords = extractTitleKeywords(job.title)
    titleKeywords.forEach(keyword => {
      patterns.push({ type: 'REJECTED_TITLE_KEYWORD', value: keyword })
    })
    patterns.push({ type: 'REJECTED_COMPANY', value: job.company })
    if (job.location) {
      patterns.push({ type: 'REJECTED_LOCATION', value: job.location })
    }
  }

  // Store custom note if provided
  if (customNote) {
    patterns.push({ type: 'REJECTION_NOTE', value: customNote })
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
    .filter(w => w.length > 3 && !genericWords.has(w) && !PROTECTED_DOMAIN_KEYWORDS.has(w))

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
      case 'REJECTED_TITLE_KEYWORD': {
        const kw = pattern.patternValue.toLowerCase()
        // Never penalize core-domain keywords
        if (PROTECTED_DOMAIN_KEYWORDS.has(kw)) break
        // Whole-word match so substrings do not false-hit
        const titleWords = titleLower.split(/[^a-z0-9]+/)
        if (titleWords.includes(kw)) {
          penaltyScore += 15 * weight
        }
        break
      }

      case 'REJECTED_COMPANY':
        if (job.company.toLowerCase() === pattern.patternValue.toLowerCase()) {
          penaltyScore += 20 * weight
        }
        break

      case 'REJECTED_LOCATION': {
        const loc = pattern.patternValue.toLowerCase()
        // Remote/worldwide is what the candidate wants -- never penalize it
        if (loc.includes('remote') || loc.includes('anywhere') || loc.includes('worldwide') || loc.includes('world')) break
        if (locationLower.includes(loc)) {
          penaltyScore += 28 * weight
        }
        break
      }

      case 'REJECTION_REASON':
        // Explicit reasons with frequency > 2 indicate strong preference
        // Apply general penalty when pattern value matches job characteristics
        if (HIGH_IMPORTANCE_LOCATION_REASONS.has(pattern.patternValue) && locationLower && !locationLower.includes('remote')) {
          penaltyScore += 24 * weight
        }
        break

      case 'REJECTED_LANGUAGE': {
        const canonical = pattern.patternValue.toLowerCase()
        if (canonical === 'non_english') break // generic marker — no reliable scoring signal
        const forms = LANGUAGE_SYNONYMS[canonical] || [canonical]
        const text = `${titleLower} ${(job.description || '').toLowerCase()}`
        for (const form of forms) {
          const idx = text.indexOf(form)
          if (idx === -1) continue
          const window = text.slice(Math.max(0, idx - 60), idx + form.length + 60)
          if (LANGUAGE_REQ_CONTEXT.test(window)) { penaltyScore += 22 * weight; break }
        }
        break
      }

      case 'REJECTED_SENIORITY':
        if (pattern.patternValue === 'too_senior') {
          const seniorIndicators = ['director', 'vp', 'head', 'principal', 'staff', 'distinguished']
          if (seniorIndicators.some(w => titleLower.includes(w))) {
            penaltyScore += 18 * weight
          }
        }
        if (pattern.patternValue === 'too_junior') {
          const juniorIndicators = ['intern', 'junior', 'entry', 'associate', 'trainee', 'graduate']
          if (juniorIndicators.some(w => titleLower.includes(w))) {
            penaltyScore += 18 * weight
          }
        }
        break
    }
  }

  return Math.min(penaltyScore, 80) // Cap at 80 point penalty so repeated location mismatches matter
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
