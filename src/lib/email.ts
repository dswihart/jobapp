import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'dswihart@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export interface JobEmailEntry {
  title: string
  company: string
  location?: string | null
  fitScore: number
  jobUrl: string
  salary?: string | null
}

export async function sendNewJobsEmail(
  toEmail: string,
  jobs: JobEmailEntry[]
): Promise<void> {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Email] GMAIL_APP_PASSWORD not set — skipping email')
    return
  }

  if (jobs.length === 0) return

  const jobRows = jobs
    .sort((a, b) => b.fitScore - a.fitScore)
    .map(
      (job) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee">
          <a href="${job.jobUrl}" style="color:#2563eb;font-weight:600;text-decoration:none">${job.title}</a>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee">${job.company}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee">${job.location ?? '—'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">
          <span style="background:${job.fitScore >= 80 ? '#16a34a' : job.fitScore >= 65 ? '#2563eb' : '#6b7280'};color:#fff;padding:2px 8px;border-radius:12px;font-size:13px">
            ${job.fitScore}%
          </span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px">${job.salary ?? '—'}</td>
      </tr>`
    )
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:24px">
      <h2 style="color:#1e293b;margin-bottom:4px">
        ${jobs.length} New Job ${jobs.length === 1 ? 'Match' : 'Matches'} Found
      </h2>
      <p style="color:#64748b;margin-top:0">
        ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 8px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">Role</th>
            <th style="padding:10px 8px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">Company</th>
            <th style="padding:10px 8px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">Location</th>
            <th style="padding:10px 8px;text-align:center;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">Fit</th>
            <th style="padding:10px 8px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">Salary</th>
          </tr>
        </thead>
        <tbody>${jobRows}</tbody>
      </table>
      <p style="margin-top:24px">
        <a href="https://jobapp.aigrowise.com" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          View All Jobs →
        </a>
      </p>
    </div>`

  await transporter.sendMail({
    from: '"Job Tracker" <dswihart@gmail.com>',
    to: toEmail,
    subject: `🎯 ${jobs.length} New Job ${jobs.length === 1 ? 'Match' : 'Matches'} — Job Tracker`,
    html,
  })

  console.log(`[Email] Sent ${jobs.length} job notification(s) to ${toEmail}`)
}

export interface ReminderItem {
  title: string
  dueDate: Date
  priority: string
  type: string
  meetingLink?: string
  location?: string
}

export async function sendReminderEmail(
  toEmail: string,
  kind: 'follow-ups' | 'interviews',
  items: ReminderItem[]
): Promise<void> {
  if (!process.env.GMAIL_APP_PASSWORD) return
  if (items.length === 0) return

  const priorityColor = (p: string) =>
    p === 'high' ? '#dc2626' : p === 'medium' ? '#d97706' : '#6b7280'

  const rows = items.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:500">${item.title}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;color:#64748b;font-size:13px">
        ${item.dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        ${item.dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee">
        <span style="background:${priorityColor(item.priority)};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px">${item.priority}</span>
      </td>
      ${item.meetingLink ? `<td style="padding:10px 8px;border-bottom:1px solid #eee"><a href="${item.meetingLink}" style="color:#2563eb">Join →</a></td>` : '<td style="padding:10px 8px;border-bottom:1px solid #eee;color:#94a3b8">' + (item.location ?? '—') + '</td>'}
    </tr>`).join('')

  const subject = kind === 'interviews'
    ? `📅 ${items.length} Interview${items.length > 1 ? 's' : ''} Coming Up — Job Tracker`
    : `⏰ ${items.length} Follow-up${items.length > 1 ? 's' : ''} Due Soon — Job Tracker`

  const heading = kind === 'interviews' ? 'Upcoming Interviews' : 'Follow-ups Due Soon'

  const html = `
    <div style="font-family:sans-serif;max-width:650px;margin:0 auto;padding:24px">
      <h2 style="color:#1e293b;margin-bottom:4px">${heading}</h2>
      <p style="color:#64748b;margin-top:0">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 8px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">Task</th>
            <th style="padding:10px 8px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">Due</th>
            <th style="padding:10px 8px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">Priority</th>
            <th style="padding:10px 8px;text-align:left;font-size:13px;color:#64748b;border-bottom:2px solid #e2e8f0">${kind === 'interviews' ? 'Link' : 'Location'}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px">
        <a href="https://jobapp.aigrowise.com" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Open Job Tracker →</a>
      </p>
    </div>`

  await transporter.sendMail({
    from: '"Job Tracker" <dswihart@gmail.com>',
    to: toEmail,
    subject,
    html,
  })

  console.log(`[Email] Sent ${items.length} ${kind} reminder(s) to ${toEmail}`)
}

// ── 2-week job-search summary ───────────────────────────────────────────────

export interface SummaryApplication {
  company: string
  role: string
  appliedDate: Date | null
}

export interface SummaryCompletedInterview {
  company: string
  role: string
  date: Date
  round: number
  outcome: string | null
  inferred?: boolean // outcome was inferred (a later round exists), not user-set
  status: string
}

export interface SummaryUpcomingInterview {
  company: string
  role: string
  date: Date
  time: string | null
  type: string
  autoDetected: boolean
}

export interface JobSearchSummaryStats {
  totalApplied: number       // all-time applications with an appliedDate
  interviewedApps: number    // distinct applications that reached an interview
  recordedOutcomes: number   // interviews with a recorded outcome
  positiveOutcomes: number   // outcomes that were passed / moved_forward
}

export interface JobSearchForecastHorizon {
  offerLikelihoodPct: number // estimated % chance of an offer by this month-end
  liveProcesses: number      // active interview processes feeding the estimate
  daysLeft: number           // days remaining until this horizon
  monthLabel: string         // e.g. "June 30"
}

export interface JobSearchForecast {
  thisMonth: JobSearchForecastHorizon
  nextMonth: JobSearchForecastHorizon
}

export interface JobSearchGoal {
  dailyGoal: number       // per-day target (applications + interviews)
  daysGoalMet: number     // days in the window that hit the target
  windowDays: number      // length of the window in days (e.g. 14)
  series: Array<{ value: number; met: boolean; isToday: boolean }> // per-day, oldest→newest
  avgPerDay: number       // average actions/day over the window
}

export interface JobSearchSummary {
  rangeStart: Date
  rangeEnd: Date
  applications: SummaryApplication[]
  completedInterviews: SummaryCompletedInterview[]
  upcomingInterviews: SummaryUpcomingInterview[]
  stats: JobSearchSummaryStats
  forecast: JobSearchForecast
  goal?: JobSearchGoal
}

// ── "Streak Keeper" palette (chosen via a 4-direction design workflow) ───────
// Evergreen/jade momentum + marigold energy accents on cool paper. Deliberately
// avoids the cream/serif/terracotta and purple-gradient AI-email clichés.
const K = {
  paper: '#eef0ec',
  card: '#ffffff',
  band: '#0e4d3c',
  gold: '#f6b93b',
  jade: '#0f6f52',
  jadeText: '#16805f',
  ink: '#17211e',
  muted: '#5f6f6a',
  faint: '#8a968f',
  cellMet: '#0f6f52',
  cellBelow: '#e7ebe8',
  cellBelowText: '#6b7873',
  cellZero: '#eef1ef',
  cellZeroText: '#aeb8b2',
  amberBg: '#fdf3e0',
  amberText: '#7a5a10',
  amberInk: '#5f4408',
  goodBg: '#e2f1ea',
  badText: '#b23b2e',
  badBg: '#f8e8e4',
  needBg: '#fdf0d6',
  needText: '#9a6a00',
}

const APP_URL = 'https://jobapp.aigrowise.com'
const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtDayLong = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

const outcomeBadgeHtml = (i: SummaryCompletedInterview): string => {
  const pill = (bg: string, color: string, label: string) =>
    `<span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${color};background-color:${bg};padding:5px 10px;border-radius:99px;white-space:nowrap">${label}</span>`
  const inferredNote = i.inferred
    ? `<div style="font-size:10px;font-style:italic;color:#a0aba4;padding-top:4px">inferred &middot; a later round exists</div>`
    : ''
  switch (i.outcome) {
    case 'moved_forward': return pill(K.goodBg, K.jade, '&#9650; Advanced')
    case 'passed': return pill(K.goodBg, K.jade, '&#9989; Passed') + inferredNote
    case 'failed': return pill(K.badBg, K.badText, 'Didn&rsquo;t advance')
    case 'pending': return pill(K.amberBg, K.amberText, '&#9203; Awaiting result')
    default: return pill('#eef1ef', '#8a968f', 'Result TBD')
  }
}

/**
 * Build the 2-week "Streak Keeper" digest HTML. Split out from the sender so it
 * can be previewed/tested without sending. Email-client-safe: nested
 * role="presentation" tables, inline styles only — no flexbox/grid/<style>/JS.
 */
export function buildJobSearchSummaryHtml(summary: JobSearchSummary): string {
  const { applications, completedInterviews, upcomingInterviews, rangeStart, rangeEnd, stats, forecast } = summary
  const goal = summary.goal

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null)
  const interviewRate = pct(stats.interviewedApps, stats.totalApplied)
  const advanceRate = pct(stats.positiveOutcomes, stats.recordedOutcomes)

  const wrapSection = (inner: string) => `<tr><td style="padding:0">${inner}</td></tr>`

  // ── Hero: streak ──────────────────────────────────────────────────────────
  const windowDays = goal?.windowDays ?? 14
  const daysGoalMet = goal?.daysGoalMet ?? 0
  const dailyGoal = goal?.dailyGoal ?? 4
  const series = goal?.series ?? []
  const avgPerDay = goal?.avgPerDay ?? 0
  const onGoalToday = series.length > 0 && series[series.length - 1].isToday && series[series.length - 1].met
  let longestRun = 0, run = 0
  for (const s of series) { if (s.met) { run++; longestRun = Math.max(longestRun, run) } else run = 0 }

  const cellW = (100 / Math.max(1, series.length || windowDays)).toFixed(3) + '%'
  const streakCells = series.map(s => {
    const bg = s.met ? K.cellMet : s.value > 0 ? K.cellBelow : K.cellZero
    const fg = s.met ? '#ffffff' : s.value > 0 ? K.cellBelowText : K.cellZeroText
    const border = s.isToday ? `border:2px solid ${K.gold};` : ''
    const pad = s.isToday ? '9px 0' : '11px 0'
    return `<td width="${cellW}" style="padding:0 2px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${bg}" style="border-radius:7px;${border}font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:15px;font-weight:700;color:${fg};padding:${pad}">${s.value}</td></tr></table></td>`
  }).join('')

  const highlight = daysGoalMet === 0
    ? `&#127793; <strong style="color:${K.amberInk}">Fresh start.</strong> No full-goal days in this window yet — four actions tomorrow puts the first one on the board.`
    : `&#127942; <strong style="color:${K.amberInk}">Longest run this window: ${longestRun} ${longestRun === 1 ? 'day' : 'days'} in a row.</strong> ${onGoalToday ? 'You&rsquo;re on goal today — keep it rolling.' : 'Get back on it today and start a new streak.'}`

  const heroSection = wrapSection(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:30px 32px 10px 32px">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;color:${K.jadeText};text-transform:uppercase">Your streak</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top:6px"><tr>
        <td valign="bottom" style="font-family:Arial,Helvetica,sans-serif"><span style="font-size:52px;line-height:52px;font-weight:800;color:${K.ink}">${daysGoalMet}</span><span style="font-size:26px;line-height:52px;font-weight:700;color:${K.faint}">&nbsp;/ ${windowDays}</span></td>
        <td valign="bottom" align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:${K.ink};padding-bottom:6px">days on goal</td>
      </tr></table>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${K.muted};padding-top:8px">You hit your goal of <strong style="color:${K.ink}">${dailyGoal} job actions a day</strong> (applications + interviews) on <strong style="color:${K.ink}">${daysGoalMet} of the last ${windowDays} days</strong> &mdash; averaging ${avgPerDay} a day.${onGoalToday ? ` And you&rsquo;re on goal <strong style="color:${K.jadeText}">today</strong>.` : ''}</div>
    </td></tr></table>
    ${series.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px 28px 6px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed"><tr>${streakCells}</tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top:7px"><tr>
        <td align="left" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${K.faint}">&larr; ${windowDays} days ago</td>
        <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${K.jadeText}">today ${onGoalToday ? '&#9989;' : ''}</td>
      </tr></table>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${K.muted};padding-top:8px">
        <span style="display:inline-block;width:11px;height:11px;background-color:${K.cellMet};border-radius:3px;vertical-align:middle">&nbsp;</span><span style="vertical-align:middle">&nbsp;on goal (${dailyGoal}+)&nbsp;&nbsp;&nbsp;</span>
        <span style="display:inline-block;width:11px;height:11px;background-color:${K.cellBelow};border-radius:3px;vertical-align:middle">&nbsp;</span><span style="vertical-align:middle">&nbsp;below goal</span>
      </div>
    </td></tr></table>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 32px 26px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${K.amberBg}" style="background-color:${K.amberBg};border-radius:12px"><tr>
        <td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:${K.amberText}">${highlight}</td>
      </tr></table>
    </td></tr></table>`)

  // ── What fueled it (3 tiles) ──────────────────────────────────────────────
  const tile = (emoji: string, n: number, label: string) => `
    <td width="33.3%" valign="top" style="padding:0 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f7f5" style="background-color:#f4f7f5;border-radius:12px"><tr><td align="center" style="padding:16px 6px;font-family:Arial,Helvetica,sans-serif">
        <div style="font-size:24px;line-height:26px">${emoji}</div>
        <div style="font-size:30px;line-height:34px;font-weight:800;color:${K.ink};padding-top:6px">${n}</div>
        <div style="font-size:12px;line-height:16px;color:${K.muted};padding-top:2px">${label}</div>
      </td></tr></table>
    </td>`
  const fueledSection = wrapSection(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 26px 6px 26px">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;color:${K.faint};text-transform:uppercase;padding:0 6px 10px 6px">What fueled it</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      ${tile('&#9993;&#65039;', applications.length, 'Applications<br>sent')}
      ${tile('&#127908;', completedInterviews.length, 'Interviews<br>done')}
      ${tile('&#128197;', upcomingInterviews.length, 'Coming<br>up')}
    </tr></table>
  </td></tr></table>`)

  // ── Where the momentum points (offer odds) ────────────────────────────────
  const oddsCard = (label: string, pctVal: number, barColor: string, pctColor: string, daysLeft: number) => `
    <td width="50%" valign="top" style="padding:0 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e3e8e4;border-radius:12px"><tr><td style="padding:16px 16px 18px 16px;font-family:Arial,Helvetica,sans-serif">
        <div style="font-size:12px;color:${K.muted};font-weight:700">${label}</div>
        <div style="font-size:34px;line-height:36px;font-weight:800;color:${pctColor};padding:4px 0 10px 0">${pctVal > 0 ? '~' + pctVal + '%' : 'low'}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:99px;overflow:hidden"><tr>
          <td bgcolor="${barColor}" height="9" width="${Math.max(2, pctVal)}%" style="font-size:0;line-height:0">&nbsp;</td>
          <td bgcolor="#eceeeb" height="9" style="font-size:0;line-height:0">&nbsp;</td>
        </tr></table>
        <div style="font-size:11px;color:${K.faint};padding-top:8px">${daysLeft} days left</div>
      </td></tr></table>
    </td>`
  const oddsSection = wrapSection(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:24px 32px 6px 32px">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;color:${K.faint};text-transform:uppercase;padding-bottom:2px">Where the momentum points</div>
      ${forecast.nextMonth.liveProcesses > 0
        ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:${K.muted}">Chance of landing an offer, from your <strong style="color:${K.ink}">${forecast.nextMonth.liveProcesses} live ${forecast.nextMonth.liveProcesses === 1 ? 'opportunity' : 'opportunities'}</strong>${advanceRate !== null ? ` and <strong style="color:${K.ink}">${advanceRate}% advance rate</strong>` : ''}.</div>`
        : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:${K.muted}">No active interview processes right now — an offer by ${esc(forecast.nextMonth.monthLabel)} is unlikely. Keep applications flowing.</div>`}
    </td></tr></table>
    ${forecast.nextMonth.liveProcesses > 0 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 26px 4px 26px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        ${oddsCard('By ' + esc(forecast.thisMonth.monthLabel), forecast.thisMonth.offerLikelihoodPct, '#f5a524', '#e8930c', forecast.thisMonth.daysLeft)}
        ${oddsCard('By ' + esc(forecast.nextMonth.monthLabel), forecast.nextMonth.offerLikelihoodPct, K.jadeText, K.jadeText, forecast.nextMonth.daysLeft)}
      </tr></table>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${K.faint};padding:8px 6px 0 6px">A rough estimate from your activity — a trajectory, not a promise.</div>
    </td></tr></table>` : ''}`)

  // ── The engine (rates) ────────────────────────────────────────────────────
  const engineSection = (interviewRate !== null || advanceRate !== null) ? wrapSection(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px 32px 4px 32px">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;color:${K.faint};text-transform:uppercase;padding-bottom:10px">The engine behind it</div>
    </td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 26px 22px 26px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="50%" valign="top" style="padding:0 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f7f5" style="background-color:#f4f7f5;border-radius:12px"><tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif">
          <div style="font-size:30px;line-height:32px;font-weight:800;color:${K.ink}">${interviewRate !== null ? interviewRate + '%' : '—'}</div>
          <div style="font-size:12px;line-height:17px;color:${K.muted};padding-top:5px"><strong style="color:${K.ink}">Interview rate</strong><br>${stats.interviewedApps} of ${stats.totalApplied} applications reached an interview</div>
        </td></tr></table></td>
        <td width="50%" valign="top" style="padding:0 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#e7f2ec" style="background-color:#e7f2ec;border-radius:12px"><tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif">
          <div style="font-size:30px;line-height:32px;font-weight:800;color:${K.jadeText}">${advanceRate !== null ? advanceRate + '%' : '—'}</div>
          <div style="font-size:12px;line-height:17px;color:#4a5a54;padding-top:5px"><strong style="color:${K.ink}">Advance rate</strong><br>${stats.positiveOutcomes} of ${stats.recordedOutcomes} interview outcomes moved you forward</div>
        </td></tr></table></td>
      </tr></table>
    </td></tr></table>`) : ''

  // ── Interviews done ───────────────────────────────────────────────────────
  const divider = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 32px"><div style="border-top:1px solid #e8ece9;font-size:0;line-height:0">&nbsp;</div></td></tr></table>`
  const doneRows = completedInterviews.length === 0
    ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${K.faint};padding:8px 0">No interviews in this period.</div>`
    : completedInterviews.map((i, idx) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top" style="padding:10px 0;${idx < completedInterviews.length - 1 ? 'border-bottom:1px solid #eef1ef;' : ''}font-family:Arial,Helvetica,sans-serif">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top"><div style="font-size:14px;font-weight:700;color:${K.ink}">${esc(i.company)}</div><div style="font-size:12px;line-height:17px;color:${K.muted}">${esc(i.role)} &middot; ${fmtDay(i.date)} &middot; Round ${i.round}</div></td>
          <td valign="top" align="right" style="white-space:nowrap">${outcomeBadgeHtml(i)}</td>
        </tr></table>
      </td></tr></table>`).join('')
  const doneSection = wrapSection(`
    ${divider}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:22px 32px 4px 32px"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${K.ink}">Interviews you showed up for <span style="color:${K.faint};font-weight:400">(${completedInterviews.length})</span></div></td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 32px 6px 32px">${doneRows}</td></tr></table>`)

  // ── Upcoming ──────────────────────────────────────────────────────────────
  // Same-day nudge: if two+ interviews fall on one day, flag it.
  const byDay = new Map<string, number>()
  for (const u of upcomingInterviews) byDay.set(fmtDay(u.date), (byDay.get(fmtDay(u.date)) || 0) + 1)
  const busyDay = [...byDay.entries()].find(([, n]) => n >= 2)
  const nudge = busyDay
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 32px 4px 32px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${K.amberBg}" style="background-color:${K.amberBg};border-radius:10px"><tr><td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:${K.amberText}">&#128204; <strong style="color:${K.amberInk}">Busy ${busyDay[0].split(',')[0] || 'day'}:</strong> ${busyDay[1]} interviews on ${esc(busyDay[0])} — leave yourself a buffer between them.</td></tr></table>
      </td></tr></table>`
    : ''
  const upRows = upcomingInterviews.length === 0
    ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${K.faint};padding:8px 0">No interviews scheduled in the next two weeks.</div>`
    : upcomingInterviews.map((u, idx) => {
        const wd = u.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()
        const md = u.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        const badge = u.autoDetected
          ? `<span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${K.needText};background-color:${K.needBg};padding:5px 10px;border-radius:99px;white-space:nowrap">&#9888; Needs confirm</span>`
          : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;color:${K.jade};background-color:${K.goodBg};padding:5px 10px;border-radius:99px;white-space:nowrap">&#10003; Confirmed</span>`
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top" style="padding:10px 0;${idx < upcomingInterviews.length - 1 ? 'border-bottom:1px solid #eef1ef;' : ''}font-family:Arial,Helvetica,sans-serif">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="top" width="52"><div style="font-size:11px;font-weight:700;color:${K.jadeText}">${wd}</div><div style="font-size:18px;font-weight:800;color:${K.ink};line-height:20px">${md}</div><div style="font-size:11px;color:${K.muted}">${u.time ? esc(u.time) : ''}</div></td>
            <td valign="top" style="padding-left:8px"><div style="font-size:14px;font-weight:700;color:${K.ink}">${esc(u.company)}</div><div style="font-size:12px;line-height:17px;color:${K.muted}">${esc(u.role)}</div></td>
            <td valign="top" align="right" style="white-space:nowrap">${badge}</td>
          </tr></table>
        </td></tr></table>`
      }).join('')
  const upSection = wrapSection(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:14px 32px 4px 32px"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${K.ink}">Coming up <span style="color:${K.faint};font-weight:400">(${upcomingInterviews.length})</span></div></td></tr></table>
    ${nudge}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 32px 6px 32px">${upRows}</td></tr></table>`)

  // ── Applications sent (company chips) ─────────────────────────────────────
  const appCompanies = [...new Set(applications.map(a => a.company.trim()).filter(Boolean))]
  const appsSection = wrapSection(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:14px 32px 6px 32px"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${K.ink}">Applications sent <span style="color:${K.faint};font-weight:400">(${appCompanies.length})</span></div></td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:6px 32px 24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:0">
      ${appCompanies.length === 0
        ? `<span style="font-size:14px;color:${K.faint}">No applications sent in this period.</span>`
        : appCompanies.map(c => `<span style="display:inline-block;font-size:13px;font-weight:600;color:#2e3a36;background-color:#eef1ef;border:1px solid #e1e6e2;border-radius:99px;padding:6px 14px;margin:0 6px 8px 0">${esc(c)}</span>`).join('')}
    </td></tr></table>`)

  // ── CTA button ────────────────────────────────────────────────────────────
  const ctaSection = wrapSection(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:6px 32px 26px 32px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${K.jade}" style="border-radius:10px">
      <a href="${APP_URL}" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;padding:13px 30px">Open Job Tracker &rarr;</a>
    </td></tr></table>
  </td></tr></table>`)

  const preheader = daysGoalMet > 0
    ? `${daysGoalMet} of ${windowDays} days on goal${onGoalToday ? " — you're on goal today. Keep the streak alive." : '.'}`
    : `Your 2-week job-search momentum digest.`

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Your Weekly Momentum</title></head>
<body style="margin:0;padding:0;background-color:${K.paper};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${K.paper};opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${K.paper}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${K.card};border-radius:18px;overflow:hidden">

<tr><td bgcolor="${K.band}" style="background-color:${K.band};padding:26px 32px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="left" style="font-family:Arial,Helvetica,sans-serif">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${K.gold};text-transform:uppercase">&#128293; Weekly Momentum</div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;padding-top:4px">Job Tracker</div>
    </td>
    <td align="right" valign="bottom" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#a8c7bb">${fmtDay(rangeStart)} &ndash;<br>${fmtDayLong(rangeEnd)}</td>
  </tr></table>
</td></tr>

${heroSection}
${fueledSection}
${oddsSection}
${engineSection}
${doneSection}
${upSection}
${appsSection}
${ctaSection}

<tr><td bgcolor="${K.band}" style="background-color:${K.band};padding:24px 32px">
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:23px;font-weight:700;color:#ffffff">Momentum is built one small action at a time.</div>
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#a8c7bb;padding-top:6px">${onGoalToday ? 'You&rsquo;re on goal today — do it again tomorrow and the streak is yours. &#128170;' : 'Four actions tomorrow and you&rsquo;re back on the board. &#128170;'}</div>
</td></tr>

</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px"><tr>
  <td align="center" style="padding:18px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#98a29c">
    Job Tracker &middot; Momentum digest for ${fmtDay(rangeStart)} &ndash; ${fmtDayLong(rangeEnd)}<br>
    <a href="${APP_URL}" style="color:#7f8c86;text-decoration:underline">Open dashboard</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="${APP_URL}/settings" style="color:#7f8c86;text-decoration:underline">Adjust your daily goal</a><br>
    You requested this summary from Job Tracker.
  </td>
</tr></table>
</td></tr></table>
</body></html>`
}

/**
 * Send the user an easy-to-read 2-week job-search digest to their own address.
 */
export async function sendJobSearchSummaryEmail(
  toEmail: string,
  summary: JobSearchSummary
): Promise<void> {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Email] GMAIL_APP_PASSWORD not set — skipping summary email')
    return
  }

  const html = buildJobSearchSummaryHtml(summary)
  const met = summary.goal ? ` · ${summary.goal.daysGoalMet}/${summary.goal.windowDays} days on goal` : ''

  await transporter.sendMail({
    from: '"Job Tracker" <dswihart@gmail.com>',
    to: toEmail,
    subject: `📊 Your job search: ${summary.applications.length} applied · ${summary.completedInterviews.length} interviewed · ${summary.upcomingInterviews.length} upcoming${met}`,
    html,
  })

  console.log(`[Email] Sent 2-week job-search summary to ${toEmail}`)
}
