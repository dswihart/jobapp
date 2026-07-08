import Anthropic from '@anthropic-ai/sdk'
import { createLLMClient } from '@/lib/llm-client'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { prisma } from '@/lib/prisma'
import { createInterviewWithRound } from '@/lib/interview-rounds'

/**
 * Email Sync — monitors the user's Gmail inbox for messages related to their
 * job search and records them as ACTIVITIES (EmailSyncEvent + Alert) linked to
 * the matching application.
 *
 * Design notes (rebuilt 2026-06-21):
 *  - It NEVER auto-mutates application.status or fabricates Interview records.
 *    Every email is recorded as an activity for the user to review.
 *  - Relevance + classification is done by AI (Claude Haiku) so we catch any
 *    application-related mail, not just known ATS senders. A cheap envelope-only
 *    pre-filter bounds AI cost; AI provides the precision.
 *  - Envelope-first fetch (we only download the body of candidate emails) keeps
 *    the manual "Sync Now" well under the nginx 180s timeout.
 *  - Dedup is by RFC822 message-id, so cron only AI-scores new arrivals.
 */

type EmailSyncClassification = 'INTERVIEW' | 'REJECTION' | 'UPDATE' | 'OTHER'

type SyncOptions = {
  forceLookbackDays?: number
}

type MatchedApplication = {
  id: string
  company: string
  role: string
  status: string
  notes: string | null
  appliedDate: Date | null
}

export type EmailSyncSummary = {
  scanned: number
  imported: number
  matched: number
  interviewsDetected: number
  rejectionsDetected: number
  rejectionsApplied: number
  updatesDetected: number
  createdInterviews: number
  createdApplications: number
}

// AI relevance/classification verdict
type AiCategory =
  | 'INTERVIEW'
  | 'REJECTION'
  | 'OFFER'
  | 'APPLICATION_RECEIVED'
  | 'RECRUITER_OUTREACH'
  | 'ASSESSMENT'
  | 'UPDATE'
  | 'NOT_RELATED'

type AiEmailVerdict = {
  related: boolean
  category: AiCategory
  company: string | null
  role: string | null
  summary: string | null
  confidence: number
  // Only populated for INTERVIEW emails that state a concrete date/time.
  interviewDate: string | null // YYYY-MM-DD as stated in the email
  interviewTime: string | null // HH:MM (24h) as stated in the email, or null
}

const COMPANY_STOP_WORDS = new Set([
  'inc', 'llc', 'ltd', 'corp', 'corporation', 'company', 'co', 'gmbh', 'sa', 'sl',
  'plc', 'group', 'holdings', 'technologies', 'technology', 'systems',
])

// Sender domains that are almost always job-search related (applicant tracking
// systems + big job boards). Used only as a cheap candidate signal — AI decides.
const ATS_SENDER_DOMAINS = [
  'greenhouse.io', 'greenhouse-mail.io', 'us.greenhouse-mail.io',
  'lever.co', 'hire.lever.co', 'ashbyhq.com', 'myworkday.com', 'workday.com',
  'myworkdayjobs.com', 'smartrecruiters.com', 'icims.com', 'jobvite.com',
  'bamboohr.com', 'breezy.hr', 'workable.com', 'teamtailor.com', 'recruitee.com',
  'taleo.net', 'successfactors.com', 'eightfold.ai', 'gem.com', 'paraform.com',
  'rippling.com', 'indeed.com', 'indeedemail.com', 'linkedin.com', 'glassdoor.com',
  'welcometothejungle.com', 'lifeatcrowdstrike.com',
]

// Subject-line / sender signals that mark an email as a job-search candidate.
// Deliberately generous (high recall); AI then confirms precision.
const SIGNAL_WORDS = /(applicat|interview|candidat|recruit|hiring|hir(e|ed|ing) team|position|\brole\b|opportunit|vacanc|your (resume|cv|profile)|assessment|take[ -]?home|coding (test|challenge)|next steps|\boffer\b|onsite|on-site|phone screen|talent|we (have )?received|thank you for applying|unfortunately|not (moving|move) forward|status of your|join (our|the) team|move forward with your)/i

const RECRUITING_SENDER = /(recruit|talent|careers?|hiring|jobs?|\bhr\b|people|workday|greenhouse|lever|ashby)/i

function normalizeText(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function companyNeedle(company: string): string {
  const filtered = normalizeText(company)
    .split(' ')
    .filter(token => token && !COMPANY_STOP_WORDS.has(token))
    .join(' ')
  return filtered || normalizeText(company)
}

function buildSnippet(subject: string | null | undefined, text: string | null | undefined): string {
  const body = (text || '').replace(/\s+/g, ' ').trim().slice(0, 400)
  return [subject?.trim(), body].filter(Boolean).join(' | ')
}

function senderDomain(fromAddress: string | null): string {
  return (fromAddress || '').toLowerCase().split('@')[1] || ''
}

/**
 * Build a stored scheduledDate from the AI-extracted YYYY-MM-DD (+ optional
 * HH:MM). We anchor to UTC (and to noon when no time is given) so the calendar
 * day never rolls across a timezone boundary in the UI. Returns null when the
 * date is missing, malformed, or implausibly far in the past/future — the
 * caller treats null as "no confident date" and skips interview creation.
 */
function buildInterviewDate(interviewDate: string | null, interviewTime: string | null): Date | null {
  if (!interviewDate || !/^\d{4}-\d{2}-\d{2}$/.test(interviewDate)) return null
  const time = interviewTime && /^([01]?\d|2[0-3]):[0-5]\d$/.test(interviewTime) ? interviewTime : '12:00'
  const parsed = new Date(`${interviewDate}T${time}:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  // Sanity window: reject dates more than ~1 year in the past or future to guard
  // against the AI echoing a year-old date or hallucinating a far-future one.
  const now = Date.now()
  const ms = parsed.getTime()
  if (ms < now - 365 * 24 * 60 * 60 * 1000 || ms > now + 365 * 24 * 60 * 60 * 1000) return null
  return parsed
}

function isSelfOrIgnored(fromAddress: string | null, mailboxUser: string): boolean {
  if (!fromAddress) return false
  const sender = fromAddress.toLowerCase()
  return (
    sender === mailboxUser.toLowerCase() ||
    sender.startsWith('dswihart@') ||
    sender.startsWith('dswihart+')
  )
}

/**
 * Cheap envelope-only pre-filter: is this email worth an AI classification?
 * Generous on purpose — AI provides precision afterwards.
 */
function isCandidate(
  subject: string,
  fromAddress: string | null,
  fromName: string | null,
  companyNeedles: string[]
): boolean {
  if (SIGNAL_WORDS.test(subject)) return true

  const domain = senderDomain(fromAddress)
  if (ATS_SENDER_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return true

  if (RECRUITING_SENDER.test(fromAddress || '') || RECRUITING_SENDER.test(fromName || '')) return true

  const hay = `${fromName || ''} ${domain}`.toLowerCase()
  if (companyNeedles.some(c => c.length >= 4 && hay.includes(c))) return true

  return false
}

/**
 * Use Claude (Haiku) to decide whether an email relates to the user's job
 * search and classify it. Returns null if AI is unavailable/failed.
 */
async function classifyEmailWithAI(input: {
  fromAddress: string | null
  fromName: string | null
  subject: string
  body: string
  companies: string[]
  receivedAt: Date
}): Promise<AiEmailVerdict | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const anthropic = createLLMClient({ apiKey })
  const prompt = `You monitor a job-seeker's email inbox and identify messages related to their job search / job applications.

The user is actively applying to jobs (cybersecurity / cloud / software roles). Their currently tracked companies include: ${input.companies.slice(0, 40).join(', ') || '(none yet)'}.

Decide if the email below is related to the user's job search. RELATED includes: confirmation an application was received, recruiter or hiring-manager outreach, interview invitations or scheduling, online assessments / take-home tests, application status updates, job offers, and rejections. NOT related: marketing, newsletters, job-board digests/alerts that merely list many open jobs, bills, receipts, and unrelated personal mail.

Respond with ONLY a JSON object, no prose:
{
  "related": true or false,
  "category": one of "INTERVIEW","REJECTION","OFFER","APPLICATION_RECEIVED","RECRUITER_OUTREACH","ASSESSMENT","UPDATE","NOT_RELATED",
  "company": "employer/company name, or null",
  "role": "job title if mentioned, or null",
  "summary": "one short sentence describing the email",
  "confidence": 0-100,
  "interviewDate": "the SCHEDULED interview date as YYYY-MM-DD, if the email states/confirms a specific date for an interview or call — including RELATIVE ones you can resolve from the reference date below; otherwise null. Do NOT invent a date the email does not reference, and do NOT use the email's sent date as the interview date.",
  "interviewTime": "the interview start time as HH:MM in 24-hour clock if a specific time is stated; otherwise null. If a timezone is given (e.g. CEST, CET, CST), keep the clock time AS STATED — do not convert."
}

This email was received on ${input.receivedAt.toISOString().slice(0, 10)}. Use that as the reference date to resolve any RELATIVE date the email states — \"today\", \"tomorrow\", \"this Thursday\", \"next Monday\", \"in two days\" — into an absolute YYYY-MM-DD for interviewDate. Only resolve a date the email actually references; never invent one.

From: ${input.fromName || ''} <${input.fromAddress || ''}>
Subject: ${input.subject}
Body:
${input.body.slice(0, 2000)}`

  try {
    const message = await anthropic.messages.create({
      model: 'open:classify',
      max_tokens: 400,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = message.content[0]
    if (!content || content.type !== 'text') return null
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const r = JSON.parse(jsonMatch[0])
    const category: AiCategory = typeof r.category === 'string' ? r.category : 'UPDATE'
    // Accept the extracted date/time only when it is well-formed; the creation
    // path below re-validates, but this keeps obviously-bad values out early.
    const rawDate = typeof r.interviewDate === 'string' ? r.interviewDate.trim() : ''
    const rawTime = typeof r.interviewTime === 'string' ? r.interviewTime.trim() : ''
    const interviewDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null
    const interviewTime = /^([01]?\d|2[0-3]):[0-5]\d$/.test(rawTime)
      ? rawTime.padStart(5, '0')
      : null
    return {
      related: r.related === true && category !== 'NOT_RELATED',
      category,
      company: r.company ? String(r.company).slice(0, 120) : null,
      role: r.role ? String(r.role).slice(0, 160) : null,
      summary: r.summary ? String(r.summary).slice(0, 300) : null,
      confidence: typeof r.confidence === 'number' ? r.confidence : 0,
      interviewDate,
      interviewTime,
    }
  } catch (error) {
    console.error('[Email Sync] AI classification failed:', error instanceof Error ? error.message : error)
    return null
  }
}

/** Fallback keyword classifier used only when AI is unavailable. */
function keywordVerdict(subject: string, text: string): AiEmailVerdict {
  const haystack = `${subject}\n${text}`.toLowerCase()
  let category: AiCategory = 'UPDATE'
  if (/(unfortunately|regret to inform|not moving forward|not be moving forward|we have decided not to|position has been filled|unsuccessful|pursue other candidates)/i.test(haystack)) {
    category = 'REJECTION'
  } else if (/(schedule (a |an |your )?(call|interview|time)|interview (invitation|request)|phone screen|technical screen|hiring manager|calendar invite|availability)/i.test(haystack)) {
    category = 'INTERVIEW'
  }
  // The keyword fallback never extracts a date or company, so it can never
  // auto-create an Application; during an AI outage it can still create a
  // dateless needs_scheduling interview for an already-matched application.
  return { related: true, category, company: null, role: null, summary: null, confidence: 40, interviewDate: null, interviewTime: null }
}

function toEnum(category: AiCategory): EmailSyncClassification {
  if (category === 'INTERVIEW') return 'INTERVIEW'
  if (category === 'REJECTION') return 'REJECTION'
  return 'UPDATE'
}

/** Associate an email to a tracked application (AI company first, then heuristic). */
function associate(
  applications: MatchedApplication[],
  aiCompany: string | null,
  subject: string,
  fromAddress: string,
  text: string
): MatchedApplication | null {
  if (aiCompany) {
    const c = normalizeText(aiCompany)
    const cc = c.replace(/\s+/g, '') // collapsed form: "the fork" -> "thefork"
    const hit = applications.find(a => {
      // Collapsed FULL name (keeps stop-words) so short names like "T-Systems"
      // ("systems" is a stop-word) and "TheFork" ↔ "The Fork" still tie.
      const fc = normalizeText(a.company).replace(/\s+/g, '')
      if (fc.length >= 4 && (cc.includes(fc) || fc.includes(cc))) return true
      // Multi-word needle substring match (e.g. "Glovo" ↔ "Glovo Delivery Hero").
      const an = companyNeedle(a.company)
      if (an.length >= 4 && (c.includes(an) || an.includes(c))) return true
      return false
    })
    if (hit) return hit
  }

  // Heuristic fallback: company token present in the email, plus a role signal.
  const haystack = normalizeText(`${subject} ${fromAddress} ${text}`)
  let best: MatchedApplication | null = null
  let bestScore = 0
  for (const application of applications) {
    const company = companyNeedle(application.company)
    const role = normalizeText(application.role)
    let score = 0
    if (company.length >= 4 && haystack.includes(company)) score += 60
    if (role && haystack.includes(role)) score += 25
    const domainToken = senderDomain(fromAddress).split('.')[0]
    if (company && domainToken && company.split(' ')[0] === domainToken) score += 30
    if (score > bestScore) {
      bestScore = score
      best = application
    }
  }
  // Require a strong signal (company + corroboration) to avoid common-word matches.
  return bestScore >= 85 ? best : null
}

function getMailboxUser(userEmail: string | null): string {
  return process.env.GMAIL_SYNC_EMAIL || process.env.NOTIFY_EMAIL || userEmail || 'dswihart@gmail.com'
}

export async function syncApplicationEmailsForUser(
  userId: string,
  options: SyncOptions = {}
): Promise<EmailSyncSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailSyncLookbackDays: true },
  })
  if (!user) {
    throw new Error('User not found')
  }

  const password = process.env.GMAIL_APP_PASSWORD
  if (!password) {
    throw new Error('GMAIL_APP_PASSWORD is not configured')
  }

  const applications = await prisma.application.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, company: true, role: true, status: true, notes: true, appliedDate: true },
    orderBy: { updatedAt: 'desc' },
  })
  const companyNeedles = applications.map(a => companyNeedle(a.company)).filter(c => c.length >= 4)
  const companyNames = applications.map(a => a.company).filter(Boolean)

  const lookbackDays = Math.max(1, options.forceLookbackDays ?? user.emailSyncLookbackDays ?? 14)
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
  const mailboxUser = getMailboxUser(user.email)

  // Cap AI classifications per run so a large backfill can't run away on cost.
  const MAX_AI_CLASSIFICATIONS = 150

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    logger: false,
    auth: { user: mailboxUser, pass: password },
  })

  const summary: EmailSyncSummary = {
    scanned: 0,
    imported: 0,
    matched: 0,
    interviewsDetected: 0,
    rejectionsDetected: 0,
    rejectionsApplied: 0,
    updatesDetected: 0,
    createdInterviews: 0,
    createdApplications: 0,
  }

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      // 1) Envelope-only pass (cheap) — gather candidates without downloading bodies.
      type Candidate = { uid: number; messageId: string; subject: string; fromAddress: string | null; fromName: string | null; receivedAt: Date; threadId: string | null }
      const candidates: Candidate[] = []

      for await (const msg of client.fetch(
        { since },
        { uid: true, envelope: true, internalDate: true, threadId: true }
      )) {
        summary.scanned++
        const env = msg.envelope
        const messageId = env?.messageId?.trim()
        if (!messageId) continue

        const subject = env?.subject?.trim() || ''
        const fromAddress = env?.from?.[0]?.address || null
        const fromName = env?.from?.[0]?.name || null

        if (isSelfOrIgnored(fromAddress, mailboxUser)) continue
        if (!isCandidate(subject, fromAddress, fromName, companyNeedles)) continue

        candidates.push({
          uid: msg.uid,
          messageId,
          subject,
          fromAddress,
          fromName,
          receivedAt: env?.date || msg.internalDate || new Date(),
          threadId: msg.threadId ? String(msg.threadId) : null,
        })
      }

      // 2) Drop already-recorded messages so we only AI-score new arrivals.
      const fresh: Candidate[] = []
      for (const c of candidates) {
        const existing = await prisma.emailSyncEvent.findUnique({
          where: { messageId: c.messageId },
          select: { id: true },
        })
        if (!existing) fresh.push(c)
      }

      let aiCalls = 0

      // 3) For each fresh candidate: download body, AI-classify, record activity.
      for (const cand of fresh) {
        if (aiCalls >= MAX_AI_CLASSIFICATIONS) {
          console.warn(`[Email Sync] Hit AI classification cap (${MAX_AI_CLASSIFICATIONS}); ${fresh.length - aiCalls} candidate(s) deferred to next run.`)
          break
        }

        const full = await client.fetchOne(String(cand.uid), { source: true }, { uid: true })
        if (!full || !full.source) continue
        const parsed = await simpleParser(full.source)

        const subject = cand.subject || parsed.subject?.trim() || ''
        const text = [
          parsed.text || '',
          parsed.html ? String(parsed.html).replace(/<[^>]+>/g, ' ') : '',
        ].join('\n')

        aiCalls++
        let verdict = await classifyEmailWithAI({
          fromAddress: cand.fromAddress,
          fromName: cand.fromName,
          subject,
          body: text,
          companies: companyNames,
          receivedAt: cand.receivedAt,
        })
        if (!verdict) {
          // AI unavailable — fall back to keywords so we still capture obvious mail.
          verdict = keywordVerdict(subject, text)
        }

        if (!verdict.related) continue

        const classification = toEnum(verdict.category)
        let matched = associate(applications, verdict.company, subject, cand.fromAddress || '', text)

        // Auto-create a tracked application from a high-signal email when that
        // company isn't already tracked. Fires for a clear "we received your
        // application" signal OR an interview invitation (an interview is strong
        // proof you applied) — both with a company name. The keyword fallback
        // never emits these categories, so an AI outage can't spuriously create
        // jobs.
        if (
          !matched &&
          (verdict.category === 'APPLICATION_RECEIVED' || verdict.category === 'INTERVIEW') &&
          verdict.company &&
          verdict.confidence >= 60
        ) {
          const newCompany = verdict.company.slice(0, 120)
          const collapsed = normalizeText(newCompany).replace(/\s+/g, '')
          const dup = applications.find(
            a => normalizeText(a.company).replace(/\s+/g, '') === collapsed
          )
          if (dup) {
            matched = dup
          } else if (collapsed.length >= 2) {
            const fromInterview = verdict.category === 'INTERVIEW'
            const created = await prisma.application.create({
              data: {
                userId,
                company: newCompany,
                role: (verdict.role || 'Unknown role').slice(0, 160),
                status: fromInterview ? 'INTERVIEWING' : 'APPLIED',
                // An interview-invitation email means you applied at some EARLIER,
                // unknown time — NOT the day the invite arrived. Leave appliedDate
                // null so it doesn't count as an application on the invite's day.
                // An application-confirmation email ~= applied that day, so keep it.
                appliedDate: fromInterview ? null : cand.receivedAt,
                notes: `Auto-added from ${fromInterview ? 'an interview-invitation' : 'an application-confirmation'} email (${cand.receivedAt.toISOString().slice(0, 10)}): ${subject}`.slice(0, 500),
              },
              select: { id: true, company: true, role: true, status: true, notes: true, appliedDate: true },
            })
            applications.push(created)
            companyNeedles.push(companyNeedle(created.company))
            matched = created
            summary.createdApplications++
            console.log(`[Email Sync] Auto-created application for "${created.company}" (${created.role}) from ${fromInterview ? 'interview' : 'confirmation'} email.`)
          }
        }

        const snippet = `[${verdict.category}] ${verdict.summary || buildSnippet(subject, text)}`.slice(0, 500)
        const matchedCompany = matched?.company || verdict.company || null

        await prisma.emailSyncEvent.create({
          data: {
            messageId: cand.messageId,
            threadId: cand.threadId,
            subject: subject || null,
            fromAddress: cand.fromAddress,
            fromName: cand.fromName,
            receivedAt: cand.receivedAt,
            classification,
            matchedCompany,
            snippet,
            userId,
            applicationId: matched?.id || null,
          },
        })

        summary.imported++
        if (matched) summary.matched++

        // When the email is tied to a tracked application, apply the Gmail
        // "Important" label so it stands out. Deliberately do NOT add \Seen:
        // the user triages their own inbox, and auto-marking interview
        // invitations as read made them easy to miss.
        if (matched) {
          try {
            await client.messageFlagsAdd(String(cand.uid), ['\\Important'], { uid: true, useLabels: true })
          } catch (flagErr) {
            console.error(`[Email Sync] Could not flag email ${cand.messageId} as important:`, flagErr instanceof Error ? flagErr.message : flagErr)
          }
        }
        if (classification === 'INTERVIEW') summary.interviewsDetected++
        else if (classification === 'REJECTION') summary.rejectionsDetected++
        else summary.updatesDetected++

        // Record a notification activity for every job-search email.
        const target = matchedCompany || cand.fromName || cand.fromAddress || 'a company'
        await prisma.alert.create({
          data: {
            userId,
            type: 'APPLICATION_UPDATE',
            message: `Job-search email (${verdict.category.replace(/_/g, ' ').toLowerCase()}) from ${target}: ${subject}`.slice(0, 280),
          },
        })

        // A confident rejection email closes out the tracked application. Move it
        // to REJECTED automatically so the board reflects reality without a manual
        // edit. Guards: only when mapped to a tracked application, only a
        // confident REJECTION verdict, never overwriting a terminal ARCHIVED/
        // REJECTED state (idempotent), and fully reversible by the user. The
        // reason is appended to notes for provenance. Any FUTURE or date-TBD open
        // interview rounds for that application are cancelled too, so the reminder
        // cron (which does not itself check status) can't email about interviews
        // for a dead application. Past rounds are left as historical record.
        if (classification === 'REJECTION' && matched && verdict.confidence >= 60) {
          // Disambiguation guard: association is by company name only, so when the
          // user has more than one OPEN application at this company (e.g. two
          // different roles), a rejection for one could land on the other and
          // wrongly kill a live process. In that ambiguous case, record the event
          // (already done above) but leave status changes to the user.
          const openSameCompany = applications.filter(
            a =>
              normalizeText(a.company) === normalizeText(matched!.company) &&
              a.status !== 'REJECTED' &&
              a.status !== 'ARCHIVED'
          )
          if (matched.status === 'REJECTED' || matched.status === 'ARCHIVED') {
            // Already terminal — idempotent no-op.
          } else if (openSameCompany.length > 1) {
            console.log(
              `[Email Sync] Rejection for "${matched.company}" NOT auto-applied: ${openSameCompany.length} open applications at this company — ambiguous, left for manual review.`
            )
          } else {
            const stamp = cand.receivedAt.toISOString().slice(0, 10)
            const rejectionNote = `Auto-marked REJECTED from a rejection email (${stamp}): ${subject}`.slice(0, 500)
            await prisma.application.update({
              where: { id: matched.id },
              data: {
                status: 'REJECTED',
                notes: matched.notes ? `${matched.notes}\n${rejectionNote}`.slice(0, 4000) : rejectionNote,
              },
            })
            const cancelled = await prisma.interview.updateMany({
              where: {
                applicationId: matched.id,
                status: { in: ['scheduled', 'rescheduled', 'needs_scheduling'] },
                OR: [{ scheduledDate: null }, { scheduledDate: { gte: cand.receivedAt } }],
              },
              data: { status: 'cancelled' },
            })
            matched.status = 'REJECTED'
            summary.rejectionsApplied++
            console.log(
              `[Email Sync] Auto-marked "${matched.company}" as REJECTED from a rejection email ` +
              `(confidence ${verdict.confidence})${cancelled.count ? `; cancelled ${cancelled.count} open interview round(s)` : ''}.`
            )
          }
        }

        // Auto-create an interview from a detected invitation tied to a tracked
        // application. Deduped against existing interviews for the same
        // application within a ±2-day window so invite + reminder + "next steps"
        // emails about the same interview don't pile up. Created rows are flagged
        // autoDetected (needs the user's confirmation) and have reminderSentAt
        // pre-stamped so the reminder cron stays silent until the user confirms.
        // No confidence gate: an INTERVIEW verdict below the old >= 60 cutoff was
        // silently dropped (e.g. the Allianz HR-interview invite on 2026-06-30),
        // which is worse than surfacing a pending-confirmation row the user can
        // dismiss. Auto-creating a whole application above still requires >= 60.
        if (
          classification === 'INTERVIEW' &&
          matched &&
          matched.status !== 'REJECTED' &&
          matched.status !== 'ARCHIVED'
        ) {
          // Don't auto-create interview rounds on a dead (REJECTED/ARCHIVED)
          // application — e.g. a stale "next steps" email arriving after a
          // rejection was already auto-applied.
          // Create the interview even when the email has no concrete date yet
          // (the common "let's find a time" / Calendly invite). Dated email ->
          // status 'scheduled'; dateless -> 'needs_scheduling' with a null date
          // for the user to fill in. Dedup only against OPEN interviews (ignore
          // cancelled/completed): dated detection within +/-2 days; dateless
          // against any open interview already tracked for the application.
          const scheduledDate = buildInterviewDate(verdict.interviewDate, verdict.interviewTime)
          const windowMs = 2 * 24 * 60 * 60 * 1000
          const openStatuses = ['scheduled', 'rescheduled', 'needs_scheduling']
          const existingInterview = await prisma.interview.findFirst({
            where: {
              applicationId: matched.id,
              status: { in: openStatuses },
              ...(scheduledDate
                ? {
                    scheduledDate: {
                      gte: new Date(scheduledDate.getTime() - windowMs),
                      lte: new Date(scheduledDate.getTime() + windowMs),
                    },
                  }
                : {}),
            },
            select: { id: true },
          })

          const prepNote = `Auto-detected from email (${cand.receivedAt.toISOString().slice(0, 10)}): ${subject}`.slice(0, 500)

          if (existingInterview) {
            // Already tracked (dated within ±2d, or any open round when dateless)
            // — nothing to do.
          } else if (scheduledDate) {
            // A dated invite arrived. If we already hold an open DATELESS round
            // for this application (a prior "let's find a time" email), upgrade
            // it in place rather than spawning a phantom second round. Keep it
            // auto-detected + reminder-suppressed until the user confirms.
            const openDateless = await prisma.interview.findFirst({
              where: { applicationId: matched.id, status: 'needs_scheduling', scheduledDate: null },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            })
            if (openDateless) {
              await prisma.interview.update({
                where: { id: openDateless.id },
                data: { scheduledDate, scheduledTime: verdict.interviewTime, status: 'scheduled' },
              })
              console.log(`[Email Sync] Upgraded a date-TBD interview for "${matched.company}" to ${scheduledDate.toISOString().slice(0, 10)} (pending user confirmation).`)
            } else {
              const { round } = await createInterviewWithRound(matched.id, {
                scheduledDate,
                scheduledTime: verdict.interviewTime,
                interviewType: 'video',
                status: 'scheduled',
                autoDetected: true,
                reminderSentAt: new Date(), // suppress reminders until confirmed
                preparationNotes: prepNote,
              })
              summary.createdInterviews++
              console.log(`[Email Sync] Auto-created interview (round ${round}) for "${matched.company}" on ${scheduledDate.toISOString().slice(0, 10)} (pending user confirmation).`)
            }
          } else {
            const { round } = await createInterviewWithRound(matched.id, {
              scheduledDate: null,
              scheduledTime: null,
              interviewType: 'video',
              status: 'needs_scheduling',
              autoDetected: true,
              reminderSentAt: new Date(), // suppress reminders until confirmed
              preparationNotes: prepNote,
            })
            summary.createdInterviews++
            console.log(`[Email Sync] Auto-created needs-scheduling interview (round ${round}) for "${matched.company}" (date TBD, pending user confirmation).`)
          }
        }
      }
    } finally {
      lock.release()
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastEmailSyncAt: new Date(), lastEmailSyncError: null },
    })

    return summary
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email sync error'
    await prisma.user.update({
      where: { id: userId },
      data: { lastEmailSyncError: message },
    }).catch(() => undefined)
    throw error
  } finally {
    await client.logout().catch(() => undefined)
  }
}
