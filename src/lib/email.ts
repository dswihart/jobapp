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

export interface JobSearchSummary {
  rangeStart: Date
  rangeEnd: Date
  applications: SummaryApplication[]
  completedInterviews: SummaryCompletedInterview[]
  upcomingInterviews: SummaryUpcomingInterview[]
  stats: JobSearchSummaryStats
  forecast: JobSearchForecast
}

const OUTCOME_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  passed: { label: '✅ Passed', color: '#15803d', bg: '#dcfce7' },
  moved_forward: { label: '➡️ Moved forward', color: '#1d4ed8', bg: '#dbeafe' },
  failed: { label: '❌ Did not advance', color: '#b91c1c', bg: '#fee2e2' },
  pending: { label: '⏳ Awaiting result', color: '#b45309', bg: '#fef3c7' },
}

function outcomeBadge(outcome: string | null): string {
  const d = outcome ? OUTCOME_DISPLAY[outcome] : null
  if (!d) {
    return '<span style="display:inline-block;background:#f1f5f9;color:#94a3b8;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600">Result TBD</span>'
  }
  return `<span style="display:inline-block;background:${d.bg};color:${d.color};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap">${d.label}</span>`
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

const fmtDateShort = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// Brand palette — kept in one place so the whole email stays consistent.
const C = {
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  headerFrom: '#4f46e5',   // indigo
  headerTo: '#2563eb',     // blue
  page: '#f1f5f9',
}

/**
 * Build the 2-week job-search digest HTML. Split out from the sender so it can
 * be previewed/tested without sending. Email-client-safe (nested tables, inline
 * styles only — no flexbox/grid/<style>) so it survives Gmail/Apple Mail/Outlook.
 */
export function buildJobSearchSummaryHtml(summary: JobSearchSummary): string {
  const { applications, completedInterviews, upcomingInterviews, rangeStart, rangeEnd, stats, forecast } = summary

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null)
  const interviewRate = pct(stats.interviewedApps, stats.totalApplied)
  const advanceRate = pct(stats.positiveOutcomes, stats.recordedOutcomes)

  // ── Reusable pieces ───────────────────────────────────────────────────────

  // A big number stat "card" cell. Three sit side-by-side in one <tr>.
  const stat = (n: number, label: string, color: string) => `
    <td width="33.33%" valign="top" style="padding:6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${C.line};border-radius:12px">
        <tr><td style="padding:18px 10px;text-align:center">
          <div style="font-size:38px;font-weight:800;color:${color};line-height:1;font-family:sans-serif">${n}</div>
          <div style="font-size:12px;color:${C.muted};margin-top:8px;text-transform:uppercase;letter-spacing:.4px;font-weight:600;font-family:sans-serif">${label}</div>
        </td></tr>
      </table>
    </td>`

  // A section: strong heading with a colored accent bar, then the body, wrapped
  // in a light card so sections are visually separated and easy to scan.
  const section = (accent: string, title: string, count: string, body: string) => `
    <tr><td style="padding:0 24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px">
        <tr>
          <td width="4" style="background:${accent};border-radius:2px;font-size:0;line-height:0">&nbsp;</td>
          <td style="padding-left:10px">
            <span style="font-size:16px;font-weight:700;color:${C.ink};font-family:sans-serif">${title}</span>
            ${count ? `<span style="font-size:13px;color:${C.faint};font-weight:600;font-family:sans-serif"> &nbsp;${count}</span>` : ''}
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${C.line};border-radius:12px;margin-top:8px">
        <tr><td style="padding:6px 14px">${body}</td></tr>
      </table>
    </td></tr>`

  const emptyLine = (msg: string) =>
    `<p style="color:${C.faint};font-size:14px;margin:10px 4px;font-family:sans-serif">${msg}</p>`

  // Zebra-striped rows read faster than flat borders.
  const rowBg = (i: number) => (i % 2 ? '#ffffff' : '#f8fafc')

  // ── Section bodies ────────────────────────────────────────────────────────

  const doneBody = completedInterviews.length === 0
    ? emptyLine('No interviews in this period.')
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif">
        ${completedInterviews.map((i, idx) => `
          <tr style="background:${rowBg(idx)}">
            <td style="padding:11px 8px;border-radius:8px 0 0 8px">
              <div style="font-weight:700;color:${C.ink};font-size:14px">${i.company}</div>
              <div style="color:${C.muted};font-size:13px;margin-top:2px">${i.role} &middot; Round ${i.round}</div>
              <div style="color:${C.faint};font-size:12px;margin-top:2px">${fmtDateShort(i.date)}</div>
            </td>
            <td valign="middle" style="padding:11px 8px;text-align:right;border-radius:0 8px 8px 0;white-space:nowrap">${outcomeBadge(i.outcome)}</td>
          </tr>`).join('')}
       </table>`

  const upcomingBody = upcomingInterviews.length === 0
    ? emptyLine('No interviews scheduled in the next two weeks.')
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif">
        ${upcomingInterviews.map((i, idx) => `
          <tr style="background:${rowBg(idx)}">
            <td style="padding:11px 8px;border-radius:8px 0 0 8px">
              <div style="font-weight:700;color:${C.ink};font-size:14px">${i.company}</div>
              <div style="color:${C.muted};font-size:13px;margin-top:2px">${i.role}${i.autoDetected ? ' <span style="color:#b45309;font-size:11px;font-weight:600">· needs confirmation</span>' : ''}</div>
            </td>
            <td valign="middle" style="padding:11px 8px;text-align:right;border-radius:0 8px 8px 0;white-space:nowrap">
              <span style="display:inline-block;background:#ecfdf5;color:#047857;padding:5px 11px;border-radius:8px;font-size:13px;font-weight:700">${fmtDateShort(i.date)}${i.time ? `<span style="font-weight:500"> · ${i.time}</span>` : ''}</span>
            </td>
          </tr>`).join('')}
       </table>`

  // Compact: distinct companies applied to (count is in the stat card above).
  const appCompanies = [...new Set(applications.map(a => a.company.trim()).filter(Boolean))]
  const appsBody = appCompanies.length === 0
    ? emptyLine('No applications sent in this period.')
    : `<p style="color:${C.body};font-size:14px;margin:8px 4px;line-height:1.9;font-family:sans-serif">
        ${appCompanies.map(c => `<span style="display:inline-block;background:#eef2ff;color:#4338ca;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;margin:0 4px 4px 0">${c}</span>`).join('')}
       </p>`

  // ── Conversion-rate strip (only if we have denominators) ──────────────────
  const rateCell = (label: string, value: string, sub: string, color: string) => `
    <td width="50%" valign="top" style="padding:4px 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${C.line};border-radius:10px">
        <tr><td style="padding:12px 14px;font-family:sans-serif">
          <div style="font-size:12px;color:${C.muted};font-weight:600">${label}</div>
          <div style="font-size:24px;font-weight:800;color:${color};line-height:1.1;margin-top:4px">${value}</div>
          <div style="font-size:11px;color:${C.faint};margin-top:3px">${sub}</div>
        </td></tr>
      </table>
    </td>`
  const rateStrip = (interviewRate !== null || advanceRate !== null)
    ? `<tr><td style="padding:14px 18px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${interviewRate !== null ? rateCell('Interview rate', `${interviewRate}%`, `${stats.interviewedApps} of ${stats.totalApplied} applications`, '#2563eb') : ''}
        ${advanceRate !== null ? rateCell('Interviews advancing', `${advanceRate}%`, `${stats.positiveOutcomes} of ${stats.recordedOutcomes} outcomes`, '#7c3aed') : ''}
      </tr></table></td></tr>`
    : ''

  // ── Offer-likelihood forecast band ────────────────────────────────────────
  const forecastBand = forecast.nextMonth.liveProcesses > 0
    ? `<tr><td style="padding:16px 18px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:16px 18px">
            <div style="color:#166534;font-size:14px;font-weight:700;text-align:center;margin-bottom:12px;font-family:sans-serif">🎯 Likelihood of securing an offer</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="50%" style="text-align:center;padding:4px;border-right:1px solid #bbf7d0;font-family:sans-serif">
                <div style="font-size:13px;color:#4b5563">by ${forecast.thisMonth.monthLabel}</div>
                <div style="font-size:26px;font-weight:800;color:#166534;line-height:1.2">${forecast.thisMonth.offerLikelihoodPct > 0 ? '~' + forecast.thisMonth.offerLikelihoodPct + '%' : 'low'}</div>
                <div style="font-size:11px;color:#9ca3af">${forecast.thisMonth.liveProcesses} live &middot; ${forecast.thisMonth.daysLeft}d left</div>
              </td>
              <td width="50%" style="text-align:center;padding:4px;font-family:sans-serif">
                <div style="font-size:13px;color:#4b5563">by ${forecast.nextMonth.monthLabel}</div>
                <div style="font-size:26px;font-weight:800;color:#166534;line-height:1.2">~${forecast.nextMonth.offerLikelihoodPct}%</div>
                <div style="font-size:11px;color:#9ca3af">${forecast.nextMonth.liveProcesses} live &middot; ${forecast.nextMonth.daysLeft}d left</div>
              </td>
            </tr></table>
            <div style="color:#9ca3af;font-size:11px;text-align:center;margin-top:10px;font-family:sans-serif">Rough estimate from your activity${advanceRate !== null ? ` (${advanceRate}% advance rate)` : ''} — not a guarantee</div>
          </td></tr>
        </table>
      </td></tr>`
    : `<tr><td style="padding:16px 18px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px">
          <tr><td style="padding:16px 18px;text-align:center;color:#991b1b;font-size:14px;font-family:sans-serif">🎯 No active interview processes right now — an offer by ${forecast.nextMonth.monthLabel} is unlikely. Keep applications flowing.</td></tr>
        </table>
      </td></tr>`

  // ── Full document ─────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.page}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${C.line}">

        <!-- Header band -->
        <tr><td style="background:${C.headerTo};background-image:linear-gradient(135deg,${C.headerFrom},${C.headerTo});padding:28px 24px">
          <div style="font-size:22px;font-weight:800;color:#ffffff;font-family:sans-serif;letter-spacing:-.3px">Your 2-Week Job-Search Summary</div>
          <div style="font-size:13px;color:#dbeafe;margin-top:4px;font-family:sans-serif">${fmtDate(rangeStart)} &nbsp;–&nbsp; ${fmtDate(rangeEnd)}</div>
        </td></tr>

        <!-- Hero stats -->
        <tr><td style="padding:20px 12px 4px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${stat(applications.length, 'Applications', '#2563eb')}
            ${stat(completedInterviews.length, 'Interviews done', '#7c3aed')}
            ${stat(upcomingInterviews.length, 'Upcoming', '#16a34a')}
          </tr></table>
        </td></tr>

        ${rateStrip}
        ${forecastBand}

        <!-- Sections -->
        ${section('#7c3aed', '🎙️ Interviews done', completedInterviews.length ? `${completedInterviews.length}` : '', doneBody)}
        ${section('#16a34a', '📅 Upcoming interviews', upcomingInterviews.length ? `${upcomingInterviews.length}` : '', upcomingBody)}
        ${section('#2563eb', '📮 Applications sent', appCompanies.length ? `${appCompanies.length} ${appCompanies.length === 1 ? 'company' : 'companies'}` : '', appsBody)}

        <!-- CTA -->
        <tr><td style="padding:26px 24px 8px;text-align:center">
          <a href="https://jobapp.aigrowise.com" style="display:inline-block;background:${C.headerTo};color:#ffffff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;font-family:sans-serif">Open Job Tracker →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:12px 24px 26px;text-align:center">
          <div style="font-size:12px;color:${C.faint};font-family:sans-serif">You're receiving this because you asked Job Tracker for a summary.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
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

  await transporter.sendMail({
    from: '"Job Tracker" <dswihart@gmail.com>',
    to: toEmail,
    subject: `📊 Your job search: ${summary.applications.length} applied · ${summary.completedInterviews.length} interviewed · ${summary.upcomingInterviews.length} upcoming`,
    html,
  })

  console.log(`[Email] Sent 2-week job-search summary to ${toEmail}`)
}
