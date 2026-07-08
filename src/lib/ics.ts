// Shared iCalendar (RFC 5545) builders used by both the single-interview
// download (/api/interviews/[id]/ics) and the subscribable per-user feed
// (/api/calendar/[token]/interviews.ics). Keeping one builder guarantees the
// two surfaces emit an identical UID + time encoding, so a user who both
// downloads an event AND subscribes to the feed gets an update-in-place rather
// than a duplicate.
//
// Times are emitted as "floating" local time (no TZID / no Z) so an event shows
// at the stated clock time in whatever calendar imports it — correct for a
// single-timezone user, and matching the app's stored floating scheduledTime.

const pad = (n: number) => String(n).padStart(2, '0')
export const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n')

export interface IcsInterview {
  id: string
  scheduledDate: Date | string | null
  scheduledTime?: string | null
  interviewType: string
  meetingLink?: string | null
  location?: string | null
  preparationNotes?: string | null
  updatedAt?: Date | string | null
}

export interface IcsApplication {
  company?: string | null
  role?: string | null
  jobUrl?: string | null
}

// SEQUENCE must be a monotonically-increasing integer well under 2^31. Raw epoch
// seconds would blow the limit around 2038; epoch MINUTES since 2020 stays tiny
// for centuries and still increases on every edit (updatedAt bump).
const SEQUENCE_EPOCH = Date.UTC(2020, 0, 1)
function sequenceFor(updatedAt?: Date | string | null): number {
  const t = updatedAt ? new Date(updatedAt).getTime() : Date.now()
  return Math.max(0, Math.floor((t - SEQUENCE_EPOCH) / 60000))
}

// Build a single VEVENT (array of unfolded lines). `roundLabel` is the DERIVED
// pipeline ordinal (e.g. "Round 2"), passed by the caller so the calendar event
// agrees with what the app and AI prompts show.
export function buildVevent(
  interview: IcsInterview,
  application: IcsApplication,
  roundLabel: string,
  dtstamp: string
): string[] {
  if (!interview.scheduledDate) return []

  const day = new Date(interview.scheduledDate).toISOString().slice(0, 10)
  const [y, m, d] = day.split('-').map(Number)
  const timeStr =
    interview.scheduledTime && /^\d{2}:\d{2}$/.test(interview.scheduledTime) ? interview.scheduledTime : null

  let dtstart: string
  let dtend: string
  if (timeStr) {
    const [hh, mm] = timeStr.split(':').map(Number)
    const start = new Date(Date.UTC(y, m - 1, d, hh, mm))
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const fmt = (dt: Date) =>
      `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`
    dtstart = `DTSTART:${fmt(start)}`
    dtend = `DTEND:${fmt(end)}`
  } else {
    const next = new Date(Date.UTC(y, m - 1, d + 1))
    dtstart = `DTSTART;VALUE=DATE:${y}${pad(m)}${pad(d)}`
    dtend = `DTEND;VALUE=DATE:${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`
  }

  const company = application.company || 'Company'
  const role = application.role || ''
  const summary = `Interview: ${company}${role ? ' — ' + role : ''}`
  const descParts = [`${interview.interviewType} interview (${roundLabel})`]
  if (application.jobUrl) descParts.push(application.jobUrl)
  if (interview.preparationNotes) descParts.push(interview.preparationNotes)
  const location = interview.meetingLink || interview.location || ''

  return [
    'BEGIN:VEVENT',
    `UID:interview-${interview.id}@jobapp.aigrowise.com`,
    `DTSTAMP:${dtstamp}`,
    `SEQUENCE:${sequenceFor(interview.updatedAt)}`,
    dtstart,
    dtend,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(descParts.join('\n'))}`,
    location ? `LOCATION:${esc(location)}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ].filter(Boolean)
}

// Wrap VEVENT blocks into a VCALENDAR document string (CRLF line endings).
export function buildVcalendar(vevents: string[][], opts?: { name?: string }): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Job Tracker//Interview//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  if (opts?.name) {
    header.push(`X-WR-CALNAME:${esc(opts.name)}`)
    header.push(`NAME:${esc(opts.name)}`)
  }
  const body = vevents.flat()
  return [...header, ...body, 'END:VCALENDAR'].join('\r\n')
}

// Stable DTSTAMP for a whole document build.
export function nowDtstamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
