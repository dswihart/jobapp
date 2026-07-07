import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// Application statuses we must never overwrite when recomputing from interviews.
const TERMINAL_STATUS = new Set(['REJECTED', 'ARCHIVED'])
const CANCELLED_STATUS = new Set(['cancelled', 'canceled'])

type TxClient = Prisma.TransactionClient

/**
 * Recompute an application's status from its interviews, inside a transaction.
 *  - Never touches terminal states (REJECTED / ARCHIVED).
 *  - Promotes to INTERVIEWING only when the app has >=1 CONFIRMED
 *    (non-autoDetected) interview in a non-cancelled state — an unconfirmed
 *    auto-detected row must not flip the app until the user confirms it.
 *  - Downgrades INTERVIEWING -> APPLIED when no interviews remain
 *    (delete-to-empty).
 * The "furthest round" is DERIVED at read time (pipeline ordinal); nothing is
 * cached here.
 */
export async function recomputeApplicationStatus(tx: TxClient, applicationId: string): Promise<void> {
  const app = await tx.application.findUnique({
    where: { id: applicationId },
    select: { status: true },
  })
  if (!app || TERMINAL_STATUS.has(app.status)) return

  const interviews = await tx.interview.findMany({
    where: { applicationId },
    select: { status: true, autoDetected: true },
  })

  if (interviews.length === 0) {
    if (app.status === 'INTERVIEWING') {
      await tx.application.update({ where: { id: applicationId }, data: { status: 'APPLIED' } })
    }
    return
  }

  const hasConfirmed = interviews.some(
    i => !i.autoDetected && !CANCELLED_STATUS.has((i.status || '').toLowerCase())
  )
  if (hasConfirmed && app.status !== 'INTERVIEWING') {
    await tx.application.update({ where: { id: applicationId }, data: { status: 'INTERVIEWING' } })
  }
}

// Interview create payload minus the fields this helper owns (round is derived;
// applicationId is passed explicitly so we can lock that row).
export type RoundlessInterviewData = Omit<
  Prisma.InterviewUncheckedCreateInput,
  'round' | 'applicationId'
>

/**
 * Create an interview with a race-safe, monotonic round number, and recompute
 * the application status — all in one transaction.
 *
 *  - Locks the Application row (SELECT ... FOR UPDATE) so concurrent creates
 *    (a manual "schedule next round" and the email-sync cron firing in the same
 *    moment) serialize on that row and receive N and N+1 rather than colliding.
 *  - nextRound = MAX(round) over ALL of the app's interviews (ANY status) + 1.
 *    Monotonic: numbers are never reused, so cancelling/deleting the top round
 *    can never produce a duplicate or a permanent P2002 once the Phase-3
 *    @@unique([applicationId, round]) backstop exists.
 *  - A bounded retry on P2002 is a belt-and-suspenders backstop for that index.
 *
 * INVARIANT: every interview writer (POST /api/interviews, email-sync, any
 * future path) MUST create through this helper. A direct prisma.interview.create
 * with a literal round re-introduces the round desync this replaces.
 */
export async function createInterviewWithRound(
  applicationId: string,
  data: RoundlessInterviewData
): Promise<{ id: string; round: number }> {
  const MAX_RETRIES = 3
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Serialize concurrent creates for this application on its row lock.
        await tx.$queryRaw`SELECT id FROM applications WHERE id = ${applicationId} FOR UPDATE`
        const agg = await tx.interview.aggregate({
          where: { applicationId },
          _max: { round: true },
        })
        const nextRound = (agg._max.round ?? 0) + 1
        const created = await tx.interview.create({
          data: { ...data, applicationId, round: nextRound },
          select: { id: true, round: true },
        })
        await recomputeApplicationStatus(tx, applicationId)
        return created
      })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        attempt < MAX_RETRIES
      ) {
        continue
      }
      throw e
    }
  }
}
