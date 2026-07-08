import { prisma } from './prisma'

/**
 * Build a compact, capped context summary of an application's whole interview
 * process — the shared prep blurb, prior rounds and their outcomes, the
 * app-scoped interviewer roster, and the most recent notes-thread entries. Fed
 * to the AI prep and analyze routes so later rounds "inherit" earlier context.
 *
 * Hard-capped (~2.2k chars) to protect the model's context/latency budget; the
 * analyze route's 60k transcript cap stays independent of this.
 */
export async function buildSharedInterviewContext(
  applicationId: string,
  opts: { excludeInterviewId?: string } = {}
): Promise<string> {
  const [app, interviews, roster, notes] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      select: { interviewContext: true },
    }),
    prisma.interview.findMany({
      where: { applicationId },
      orderBy: { round: 'asc' },
      select: { id: true, interviewType: true, status: true, outcome: true },
    }),
    prisma.interviewer.findMany({
      where: { OR: [{ applicationId }, { interview: { applicationId } }] },
      select: { name: true, title: true, email: true },
    }),
    prisma.interviewNote.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { round: true, body: true },
    }),
  ])

  const parts: string[] = []

  if (app?.interviewContext && app.interviewContext.trim()) {
    parts.push(`Shared prep notes for this company:\n${app.interviewContext.trim().slice(0, 600)}`)
  }

  const priorRounds = interviews.filter(i => i.id !== opts.excludeInterviewId)
  if (priorRounds.length) {
    const lines = priorRounds.map((i, idx) => {
      const bits = [`Round ${idx + 1}`, i.interviewType, i.status]
      if (i.outcome) bits.push(`outcome: ${i.outcome}`)
      return `- ${bits.filter(Boolean).join(' · ')}`
    })
    parts.push(`Rounds in this process so far:\n${lines.join('\n')}`)
  }

  // Dedup roster by lower(name)+lower(email).
  const seen = new Set<string>()
  const rosterNames = roster
    .filter(r => {
      const k = `${r.name.trim().toLowerCase()}|${(r.email || '').trim().toLowerCase()}`
      if (!r.name.trim() || seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 10)
    .map(r => (r.title ? `${r.name} (${r.title})` : r.name))
  if (rosterNames.length) {
    parts.push(`People met/scheduled across rounds: ${rosterNames.join(', ')}`)
  }

  if (notes.length) {
    const chrono = [...notes].reverse()
    const lines = chrono.map(n => {
      const prefix = n.round ? `[R${n.round}] ` : ''
      return `- ${prefix}${n.body.trim().replace(/\s+/g, ' ').slice(0, 220)}`
    })
    parts.push(`Recent notes from this process:\n${lines.join('\n')}`)
  }

  return parts.join('\n\n').slice(0, 2200)
}
