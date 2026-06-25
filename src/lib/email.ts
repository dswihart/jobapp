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
