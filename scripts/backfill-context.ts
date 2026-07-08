/**
 * Phase 4 idempotent backfill. Safe to re-run (every write keyed on a unique
 * sourceKey or guarded by IS NULL), so re-running is a no-op.
 *
 *  1) Promote existing per-interview roster rows to application scope by setting
 *     interviewers.application_id from their interview's application_id. Existing
 *     interview_id is kept; the read layer unions per-interview ∪ app-scoped and
 *     dedups by name+email.
 *  2) Seed the InterviewNote thread from the columns that used to hold the
 *     running narrative — Interview.postInterviewNotes, Interview.companyFeedback,
 *     and legacy Application.interviewNotes — so no history is lost when the
 *     modal stops overwriting those fields.
 *
 * Run: cd /opt/job-tracker && npx --yes tsx scripts/backfill-context.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  // 1) Roster promotion (only rows not already app-scoped).
  const promoted: number = await prisma.$executeRaw`
    UPDATE interviewers iv
    SET application_id = i.application_id
    FROM interviews i
    WHERE iv.interview_id = i.id
      AND iv.application_id IS NULL
  `
  console.log(`[backfill] roster rows promoted to application scope: ${promoted}`)

  // 2a) Seed notes from per-round Interview columns.
  const rounds = await prisma.interview.findMany({
    where: {
      OR: [
        { postInterviewNotes: { not: null } },
        { companyFeedback: { not: null } },
      ],
    },
    select: {
      id: true,
      applicationId: true,
      round: true,
      postInterviewNotes: true,
      companyFeedback: true,
      createdAt: true,
    },
  })

  let notesSeeded = 0
  const seed = async (opts: {
    sourceKey: string
    applicationId: string
    interviewId: string | null
    round: number | null
    body: string
    createdAt: Date
  }) => {
    const body = opts.body.trim()
    if (!body) return
    await prisma.interviewNote.upsert({
      where: { sourceKey: opts.sourceKey },
      update: {}, // never overwrite — append-only
      create: {
        applicationId: opts.applicationId,
        interviewId: opts.interviewId,
        round: opts.round,
        body,
        authorType: 'backfill',
        sourceKey: opts.sourceKey,
        createdAt: opts.createdAt,
      },
    })
    notesSeeded++
  }

  for (const r of rounds) {
    if (r.postInterviewNotes && r.postInterviewNotes.trim()) {
      await seed({
        sourceKey: `postnotes:${r.id}`,
        applicationId: r.applicationId,
        interviewId: r.id,
        round: r.round,
        body: r.postInterviewNotes,
        createdAt: r.createdAt,
      })
    }
    if (r.companyFeedback && r.companyFeedback.trim()) {
      await seed({
        sourceKey: `feedback:${r.id}`,
        applicationId: r.applicationId,
        interviewId: r.id,
        round: r.round,
        body: `Company feedback: ${r.companyFeedback}`,
        createdAt: r.createdAt,
      })
    }
  }

  // 2b) Seed notes from legacy per-application Application.interviewNotes.
  const apps = await prisma.application.findMany({
    where: { interviewNotes: { not: null } },
    select: { id: true, interviewNotes: true, createdAt: true },
  })
  for (const a of apps) {
    if (a.interviewNotes && a.interviewNotes.trim()) {
      await seed({
        sourceKey: `applegacy:${a.id}`,
        applicationId: a.id,
        interviewId: null,
        round: null,
        body: a.interviewNotes,
        createdAt: a.createdAt,
      })
    }
  }

  console.log(`[backfill] interview notes seeded (idempotent upserts): ${notesSeeded}`)
  console.log('[backfill] done.')
}

main()
  .catch((e) => {
    console.error('[backfill] FAILED:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
