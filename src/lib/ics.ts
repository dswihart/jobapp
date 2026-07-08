// Shared iCalendar (RFC 5545) builders used by both the single-interview
// download (/api/interviews/[id]/ics) and the subscribable per-user feed
// (/api/calendar/[token]/interviews.ics). Keeping one builder guarantees the
// two surfaces emit an identical UID + time encoding, so a user who both
// downloads an event AND subscribes to the feed gets an update-in-place rather
// than a duplicate.
//
// Timed events are emitted with an explicit TZID (Europe/Madrid) plus a
// VTIMEZONE definition, NOT as floating local time. Subscribed .ics feeds in
// Google Calendar interpret floating DTSTART as UTC, which shifted every event
// by the viewer's offset (a 15:00 interview showed at 17:00 in summer). Binding
// the stored wall-clock to Europe/Madrid makes Google/Apple render the correct
// local time regardless of the device's timezone. The stored scheduledTime is
// the canonical wall-clock; scheduledDate supplies only the calendar day.

// The user's timezone. Single-user app → hardcoded; the stored clock times are
// this zone's wall-clock. Standard EU DST rules (last Sun Mar / last Sun Oct).
const APP_TZID = 'Europe/Madrid'
const APP_VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${APP_TZID}`,
  'X-LIC-LOCATION:Europe/Madrid',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

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
    // Emit the stored wall-clock bound to Europe/Madrid (TZID), plus a one-hour
    // default duration. Compute the end time by wall-clock arithmetic (mod 24)
    // so we never cross into UTC and reintroduce an offset bug.
    const [hh, mm] = timeStr.split(':').map(Number)
    const endHh = (hh + 1) % 24
    // If +1h wraps past midnight, the end lands on the next calendar day.
    const endDay = hh + 1 >= 24 ? new Date(Date.UTC(y, m - 1, d + 1)) : new Date(Date.UTC(y, m - 1, d))
    const startStamp = `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`
    const endStamp = `${endDay.getUTCFullYear()}${pad(endDay.getUTCMonth() + 1)}${pad(endDay.getUTCDate())}T${pad(endHh)}${pad(mm)}00`
    dtstart = `DTSTART;TZID=${APP_TZID}:${startStamp}`
    dtend = `DTEND;TZID=${APP_TZID}:${endStamp}`
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
  header.push(`X-WR-TIMEZONE:${APP_TZID}`)
  // VTIMEZONE must precede any VEVENT that references its TZID.
  const body = vevents.flat()
  return [...header, ...APP_VTIMEZONE, ...body, 'END:VCALENDAR'].join('\r\n')
}

// Stable DTSTAMP for a whole document build.
export function nowDtstamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
