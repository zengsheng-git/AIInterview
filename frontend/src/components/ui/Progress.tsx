import { clsx } from 'clsx'

export function Progress({
  value,
  max = 100,
  className,
  color = 'primary',
  showGradient = false,
}: {
  value: number
  max?: number
  className?: string
  color?: 'primary' | 'green' | 'orange' | 'red'
  showGradient?: boolean
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const colors = {
    primary: 'bg-indigo-500',
    green: 'bg-emerald-500',
    orange: 'bg-amber-500',
    red: 'bg-red-500',
  }
  return (
    <div
      className={clsx(
        'w-full h-1.5 bg-slate-100 rounded-full overflow-hidden',
        className,
      )}
    >
      <div
        className={clsx(
          'h-full transition-all duration-500',
          showGradient
            ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
            : colors[color],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
