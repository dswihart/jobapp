'use client'

// A small, warm daily banner for the authenticated app — brings the
// encouragement that previously only lived on the logged-out /login page
// into the place where the actual job-search work happens.

const MESSAGES = [
  'Every application is a step closer. Keep going! 🚀',
  "You're one 'yes' away from a great new chapter. ✨",
  'Progress over perfection — just send the next one. 💪',
  'Each no clears the way to the right yes. 🌱',
  'Future you is grateful for the work you put in today. 🙌',
  'Small consistent steps win the job search. 🧭',
  "You've got a strong profile — let them see it. ⭐",
  'Momentum beats motivation. One more today. 🔥',
  'The right role is out there looking for you too. 🔎',
  'Rejections are redirections. Keep moving. ➡️',
  'Your next opportunity could be one click away. 🍀',
  'Show up, apply, repeat — that’s how this gets won. 🏆',
  'Consistency compounds. Today counts. 📈',
  'Be proud of the effort, not just the outcome. 💙',
  'You’re doing the hard thing. That matters. 🌟',
]

export default function DailyEncouragement({
  name,
  appliedToday,
  goal,
}: {
  name?: string
  appliedToday: number
  goal: number
}) {
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  const message = MESSAGES[dayIndex % MESSAGES.length]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = name ? name.split(' ')[0] : ''
  const safeGoal = goal > 0 ? goal : 6
  const pct = Math.min(100, Math.round((appliedToday / safeGoal) * 100))
  const done = appliedToday >= safeGoal

  return (
    <div className="mb-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm opacity-90">
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </p>
          <p className="font-medium">{message}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs opacity-90">Today’s goal</p>
          <p className="text-lg font-semibold">
            {appliedToday} / {safeGoal} {done ? '🎉' : ''}
          </p>
          <div className="mt-1 h-1.5 w-36 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
