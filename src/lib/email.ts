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

const OUTCOME_DISPLAY: Record<string, { label: string; color: string }> = {
  passed: { label: '✅ Passed', color: '#16a34a' },
  moved_forward: { label: '➡️ Moved forward', color: '#2563eb' },
  failed: { label: '❌ Did not advance', color: '#dc2626' },
  pending: { label: '⏳ Awaiting result', color: '#d97706' },
}

function outcomeBadge(outcome: string | null): string {
  const d = outcome ? OUTCOME_DISPLAY[outcome] : null
  if (!d) {
    return '<span style="color:#94a3b8;font-size:13px">— result not recorded</span>'
  }
  return `<span style="background:${d.color};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px">${d.label}</span>`
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

/**
 * Send the user an easy-to-read 2-week job-search digest: applications sent,
 * interviews completed (with outcomes), and upcoming interviews.
 */
export async function sendJobSearchSummaryEmail(
  toEmail: string,
  summary: JobSearchSummary
): Promise<void> {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Email] GMAIL_APP_PASSWORD not set — skipping summary email')
    return
  }

  const { applications, completedInterviews, upcomingInterviews, rangeStart, rangeEnd, stats, forecast } = summary

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null)
  const interviewRate = pct(stats.interviewedApps, stats.totalApplied)
  const advanceRate = pct(stats.positiveOutcomes, stats.recordedOutcomes)
  const rateChips = [
    interviewRate !== null
      ? `Interview rate <b style="color:#2563eb">${interviewRate}%</b> <span style="color:#94a3b8">(${stats.interviewedApps} of ${stats.totalApplied} applications)</span>`
      : null,
    advanceRate !== null
      ? `Interviews advancing <b style="color:#7c3aed">${advanceRate}%</b> <span style="color:#94a3b8">(${stats.positiveOutcomes} of ${stats.recordedOutcomes})</span>`
      : null,
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')

  const stat = (n: number, label: string, color: string) => `
    <td style="padding:0 6px" width="33%" valign="top">
      <div style="background:${color}11;border:1px solid ${color}33;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:34px;font-weight:700;color:${color};line-height:1">${n}</div>
        <div style="font-size:13px;color:#475569;margin-top:6px">${label}</div>
      </div>
    </td>`

  const section = (title: string, body: string) => `
    <h3 style="color:#1e293b;font-size:16px;margin:28px 0 10px">${title}</h3>${body}`

  // Compact: just the distinct companies applied to (the count is in the stat card
  // above) — a quick scan of where applications went, not a row-per-application table.
  const appCompanies = [...new Set(applications.map(a => a.company.trim()).filter(Boolean))]
  const appsBody = appCompanies.length === 0
    ? '<p style="color:#94a3b8;font-size:14px;margin:0">No applications sent in this period.</p>'
    : `<p style="color:#475569;font-size:14px;margin:0;line-height:1.8">
        <span style="color:#94a3b8">${appCompanies.length} ${appCompanies.length === 1 ? 'company' : 'companies'}: </span>${appCompanies.join(' &middot; ')}
       </p>`

  const doneBody = completedInterviews.length === 0
    ? '<p style="color:#94a3b8;font-size:14px;margin:0">No interviews in this period.</p>'
    : `<table style="width:100%;border-collapse:collapse">
        ${completedInterviews.map(i => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#1e293b">${i.company}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;color:#475569;font-size:14px">${i.role}<span style="color:#94a3b8"> · R${i.round}</span></td>
            <td style="padding:8px;border-bottom:1px solid #eee;color:#94a3b8;font-size:13px">${fmtDate(i.date)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${outcomeBadge(i.outcome)}</td>
          </tr>`).join('')}
       </table>`

  const upcomingBody = upcomingInterviews.length === 0
    ? '<p style="color:#94a3b8;font-size:14px;margin:0">No interviews scheduled in the next two weeks.</p>'
    : `<table style="width:100%;border-collapse:collapse">
        ${upcomingInterviews.map(i => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#1e293b">${i.company}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;color:#475569;font-size:14px">${i.role}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;color:#1e293b;font-size:13px;text-align:right;white-space:nowrap">${fmtDate(i.date)}${i.time ? ` · ${i.time}` : ''}</td>
          </tr>`).join('')}
       </table>`

  const html = `
    <div style="font-family:sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#1e293b">
      <h2 style="margin-bottom:2px">Your 2-Week Job-Search Summary</h2>
      <p style="color:#64748b;margin-top:0">${fmtDate(rangeStart)} – ${fmtDate(rangeEnd)}</p>

      ${forecast.nextMonth.liveProcesses > 0
        ? `<div style="margin-top:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px">
            <div style="color:#166534;font-size:14px;font-weight:600;text-align:center;margin-bottom:10px">🎯 Likelihood of securing an offer</div>
            <table style="width:100%;border-collapse:collapse"><tr>
              <td style="text-align:center;padding:4px;border-right:1px solid #bbf7d0;width:50%">
                <div style="font-size:13px;color:#4b5563">by ${forecast.thisMonth.monthLabel}</div>
                <div style="font-size:22px;font-weight:700;color:#166534">${forecast.thisMonth.offerLikelihoodPct > 0 ? '~' + forecast.thisMonth.offerLikelihoodPct + '%' : 'low'}</div>
                <div style="font-size:11px;color:#9ca3af">${forecast.thisMonth.liveProcesses} live &middot; ${forecast.thisMonth.daysLeft}d left</div>
              </td>
              <td style="text-align:center;padding:4px;width:50%">
                <div style="font-size:13px;color:#4b5563">by ${forecast.nextMonth.monthLabel}</div>
                <div style="font-size:22px;font-weight:700;color:#166534">~${forecast.nextMonth.offerLikelihoodPct}%</div>
                <div style="font-size:11px;color:#9ca3af">${forecast.nextMonth.liveProcesses} live &middot; ${forecast.nextMonth.daysLeft}d left</div>
              </td>
            </tr></table>
            <div style="color:#9ca3af;font-size:11px;text-align:center;margin-top:8px">Rough estimate from your activity${advanceRate !== null ? ` (${advanceRate}% advance rate)` : ''} — not a guarantee</div>
          </div>`
        : `<div style="margin-top:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;text-align:center">
            <div style="color:#991b1b;font-size:14px">🎯 No active interview processes right now — an offer by ${forecast.nextMonth.monthLabel} is unlikely. Keep applications flowing.</div>
          </div>`}

      <p style="color:#64748b;font-size:13px;margin:18px 0 8px;font-weight:600">Last 2 weeks</p>
      <table style="width:100%;border-collapse:separate;border-spacing:0"><tr>
        ${stat(applications.length, 'Applications sent', '#2563eb')}
        ${stat(completedInterviews.length, 'Interviews done', '#7c3aed')}
        ${stat(upcomingInterviews.length, 'Upcoming interviews', '#16a34a')}
      </tr></table>
      ${rateChips ? `<p style="text-align:center;color:#475569;font-size:13px;margin:14px 0 0;line-height:1.7">${rateChips}</p>` : ''}

      ${section('🎙️ Interviews done &amp; how they turned out', doneBody)}
      ${section('📅 Upcoming interviews', upcomingBody)}
      ${section('📮 Applications sent', appsBody)}

      <p style="margin-top:28px">
        <a href="https://jobapp.aigrowise.com" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Open Job Tracker →</a>
      </p>
    </div>`

  await transporter.sendMail({
    from: '"Job Tracker" <dswihart@gmail.com>',
    to: toEmail,
    subject: `📊 Your job search: ${applications.length} applied · ${completedInterviews.length} interviewed · ${upcomingInterviews.length} upcoming`,
    html,
  })

  console.log(`[Email] Sent 2-week job-search summary to ${toEmail}`)
}
