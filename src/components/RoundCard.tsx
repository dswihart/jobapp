'use client'

import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  VideoCameraIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import type { Interview } from '@/lib/interview-types'

interface RoundCardProps {
  interview: Interview
  // 1-based pipeline ordinal (the "Round N" the user sees), or null for a
  // cancelled round which carries no number.
  ordinal: number | null
  expanded?: boolean
  onToggleExpand?: () => void
  onOpenDetail?: (interview: Interview) => void
  onConfirm?: (id: string) => void
  onArchive?: (id: string, archived: boolean) => void
  onPrep?: (id: string, regenerate: boolean) => void
  preppingId?: string | null
  prepError?: string
  // Read-only render (e.g. the application detail page): hides all mutating
  // controls and the expand toggle.
  readOnly?: boolean
}

const statusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'rescheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'needs_scheduling': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    case 'no-show': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

const outcomeIcon = (outcome?: string) => {
  switch (outcome) {
    case 'passed':
    case 'moved_forward':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    case 'failed':
      return <XCircleIcon className="h-5 w-5 text-red-500" />
    case 'pending':
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
    default:
      return null
  }
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'video': return <VideoCameraIcon className="h-4 w-4" />
    case 'phone': return <PhoneIcon className="h-4 w-4" />
    case 'in-person': return <MapPinIcon className="h-4 w-4" />
    default: return <CalendarIcon className="h-4 w-4" />
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Date TBD'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Google Calendar "add event" link — floating local clock time, 1h default.
const googleCalUrl = (iv: Interview) => {
  if (!iv.scheduledDate) return '#'
  const day = iv.scheduledDate.slice(0, 10)
  const time = iv.scheduledTime && /^\d{2}:\d{2}$/.test(iv.scheduledTime) ? iv.scheduledTime : '12:00'
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d, hh, mm))
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}T${String(dt.getUTCHours()).padStart(2, '0')}${String(dt.getUTCMinutes()).padStart(2, '0')}00`
  const title = `Interview: ${iv.application?.company || 'Company'}${iv.application?.role ? ' — ' + iv.application.role : ''}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${iv.interviewType} interview`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// The round-rail marker: filled circle with the ordinal, or a muted dash for a
// cancelled round.
function OrdinalMarker({ ordinal, cancelled }: { ordinal: number | null; cancelled: boolean }) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        cancelled
          ? 'bg-gray-100 text-gray-400 line-through dark:bg-gray-700 dark:text-gray-500'
          : 'bg-blue-600 text-white'
      }`}
      title={cancelled ? 'Cancelled round' : `Round ${ordinal}`}
    >
      {cancelled ? '—' : ordinal}
    </div>
  )
}

export default function RoundCard({
  interview,
  ordinal,
  expanded = false,
  onToggleExpand,
  onOpenDetail,
  onConfirm,
  onArchive,
  onPrep,
  preppingId,
  prepError,
  readOnly = false,
}: RoundCardProps) {
  const cancelled = interview.status === 'cancelled' || interview.status === 'canceled'

  return (
    <div className="flex gap-3">
      <OrdinalMarker ordinal={ordinal} cancelled={cancelled} />

      <div className="min-w-0 flex-1 rounded-lg border border-gray-100 p-3 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                {ordinal ? `Round ${ordinal}` : 'Cancelled round'}
              </span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <CalendarIcon className="h-4 w-4" />
                {formatDate(interview.scheduledDate)}
              </span>
              {interview.scheduledTime && (
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-4 w-4" />
                  {interview.scheduledTime}
                </span>
              )}
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                {typeIcon(interview.interviewType)}
                <span className="capitalize">{interview.interviewType}</span>
              </span>
              {interview.stage && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize dark:bg-gray-700">
                  {interview.stage}
                </span>
              )}
            </div>

            {interview.scheduledDate && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <a
                  href={`/api/interviews/${interview.id}/ics`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                >
                  <CalendarIcon className="h-3.5 w-3.5" /> Add to calendar
                </a>
                <a
                  href={googleCalUrl(interview)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                >
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /> Google Calendar
                </a>
              </div>
            )}

            {(interview.interviewers?.length ?? 0) > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <UserGroupIcon className="h-4 w-4" />
                <span className="truncate">{interview.interviewers.map(i => i.name).join(', ')}</span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {outcomeIcon(interview.outcome || undefined)}
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(interview.status)}`}>
              {interview.status.replace(/_/g, ' ')}
            </span>
            {interview.aiAnalysis && <SparklesIcon className="h-5 w-5 text-purple-500" />}
            {!readOnly && onArchive && (
              <button
                onClick={() => onArchive(interview.id, !interview.archived)}
                title={interview.archived ? 'Unarchive' : 'Archive'}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {interview.archived
                  ? <ArrowUturnLeftIcon className="h-5 w-5 text-gray-400" />
                  : <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />}
              </button>
            )}
            {!readOnly && onToggleExpand && (
              <button onClick={onToggleExpand} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                {expanded
                  ? <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                  : <ChevronDownIcon className="h-5 w-5 text-gray-400" />}
              </button>
            )}
          </div>
        </div>

        {!readOnly && interview.autoDetected && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
            <span className="flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
              <SparklesIcon className="h-4 w-4" />
              {interview.scheduledDate
                ? 'Auto-detected from your email — review the date/time, then confirm.'
                : 'Auto-detected from your email — add the date, then confirm.'}
            </span>
            <div className="flex items-center gap-2">
              {onOpenDetail && (
                <button
                  onClick={() => onOpenDetail(interview)}
                  className="px-3 py-1 text-sm font-medium text-amber-800 hover:underline dark:text-amber-300"
                >
                  Review
                </button>
              )}
              {onConfirm && (
                <button
                  onClick={() => onConfirm(interview.id)}
                  className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Confirm
                </button>
              )}
            </div>
          </div>
        )}

        {expanded && !readOnly && (
          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-700">
            {onPrep && (
              <div>
                {interview.prepBrief ? (
                  <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm dark:border-purple-800 dark:bg-purple-900/20">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-purple-800 dark:text-purple-300">
                        <SparklesIcon className="h-4 w-4" /> AI interview prep
                      </span>
                      <button
                        onClick={() => onPrep(interview.id, true)}
                        disabled={preppingId === interview.id}
                        className="text-xs text-purple-700 hover:underline disabled:opacity-50 dark:text-purple-400"
                      >
                        {preppingId === interview.id ? 'Regenerating…' : 'Regenerate'}
                      </button>
                    </div>
                    {interview.prepBrief.companyBrief && (
                      <p className="text-gray-700 dark:text-gray-300">{interview.prepBrief.companyBrief}</p>
                    )}
                    {Array.isArray(interview.prepBrief.likelyQuestions) && interview.prepBrief.likelyQuestions.length > 0 && (
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Likely questions</div>
                        <ul className="list-inside list-disc text-gray-700 dark:text-gray-300">
                          {interview.prepBrief.likelyQuestions.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(interview.prepBrief.talkingPoints) && interview.prepBrief.talkingPoints.length > 0 && (
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Talking points</div>
                        <ul className="list-inside list-disc text-gray-700 dark:text-gray-300">
                          {interview.prepBrief.talkingPoints.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(interview.prepBrief.questionsToAsk) && interview.prepBrief.questionsToAsk.length > 0 && (
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Questions to ask them</div>
                        <ul className="list-inside list-disc text-gray-700 dark:text-gray-300">
                          {interview.prepBrief.questionsToAsk.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => onPrep(interview.id, false)}
                    disabled={preppingId === interview.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    <SparklesIcon className="h-4 w-4" /> {preppingId === interview.id ? 'Preparing…' : 'Prep me with AI'}
                  </button>
                )}
                {prepError && preppingId !== interview.id && <p className="mt-1 text-xs text-red-500">{prepError}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              {interview.location && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Location:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{interview.location}</span>
                </div>
              )}
              {interview.duration && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{interview.duration} min</span>
                </div>
              )}
              {interview.outcome && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Outcome:</span>
                  <span className="ml-2 capitalize text-gray-900 dark:text-white">{interview.outcome.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            {(interview.preparationNotes || interview.postInterviewNotes) && (
              <div className="space-y-2">
                {interview.preparationNotes && (
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Prep Notes: </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {interview.preparationNotes.substring(0, 150)}
                      {interview.preparationNotes.length > 150 ? '…' : ''}
                    </span>
                  </div>
                )}
                {interview.postInterviewNotes && (
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Post-Interview Notes: </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {interview.postInterviewNotes.substring(0, 150)}
                      {interview.postInterviewNotes.length > 150 ? '…' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {interview.followUpSteps && interview.followUpSteps.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <SparklesIcon className="h-4 w-4 text-purple-500" />
                  AI Suggested Follow-ups
                </h4>
                <ul className="space-y-1">
                  {interview.followUpSteps.slice(0, 3).map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${
                        step.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        step.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {step.priority}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">{step.action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {onOpenDetail && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onOpenDetail(interview)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  View Details
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
