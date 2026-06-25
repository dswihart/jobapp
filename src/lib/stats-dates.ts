// Timezone-aware daily buckets for the stats grids.
//
// The server runs in UTC, but the user is in Spain. If we bucket applications by
// UTC calendar day, the user's *current* local day doesn't appear until UTC
// catches up (e.g. 01:37 Madrid is still 23:37 UTC of the previous day). To keep
// the daily grid aligned with the user's local day — including "today" — we bucket
// by Europe/Madrid calendar days here. Both stats APIs (login + /stats) use this,
// so the two pages stay identical.

const DEFAULT_TIME_ZONE = 'Europe/Madrid'

// Offset (ms) such that localWallClock = utcInstant + offset, for `date` in `timeZone`.
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value
  const hour = map.hour === '24' ? 0 : Number(map.hour)
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second)
  )
  return asUTC - date.getTime()
}

// UTC instant of local midnight for calendar day (year, monthIndex, day) in `timeZone`.
// Date.UTC normalizes out-of-range day/month, so passing day-i (possibly negative) works.
function localMidnightUTC(year: number, monthIndex: number, day: number, timeZone: string): Date {
  const naiveUTC = Date.UTC(year, monthIndex, day, 0, 0, 0)
  const off1 = tzOffsetMs(new Date(naiveUTC), timeZone)
  let utc = naiveUTC - off1
  // Re-check around DST transitions (offset can differ at the corrected instant).
  const off2 = tzOffsetMs(new Date(utc), timeZone)
  if (off2 !== off1) utc = naiveUTC - off2
  return new Date(utc)
}

export interface DayBucket {
  start: Date // inclusive UTC instant
  end: Date // exclusive UTC instant
  dateStr: string // YYYY-MM-DD calendar date in `timeZone`
}

// Last `numDays` calendar days in `timeZone`, oldest first; the final entry is "today".
export function getDailyBuckets(numDays: number, timeZone: string = DEFAULT_TIME_ZONE): DayBucket[] {
  const now = new Date()
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now) // 'YYYY-MM-DD'
  const [ty, tm, td] = todayStr.split('-').map(Number)

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const buckets: DayBucket[] = []
  for (let i = numDays - 1; i >= 0; i--) {
    const start = localMidnightUTC(ty, tm - 1, td - i, timeZone)
    const end = localMidnightUTC(ty, tm - 1, td - i + 1, timeZone)
    buckets.push({ start, end, dateStr: fmt.format(start) })
  }
  return buckets
}
