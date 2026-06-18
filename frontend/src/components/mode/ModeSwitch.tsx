import { clsx } from 'clsx'
import { GraduationCap, ShieldAlert } from 'lucide-react'

export function ModeSwitch({ value, onChange, disabled }: {
  value: 'practice' | 'strict'
  onChange: (m: 'practice' | 'strict') => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      <button
        disabled={disabled}
        onClick={() => onChange('practice')}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:cursor-not-allowed',
          value === 'practice'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800 disabled:opacity-50',
        )}
      >
        <GraduationCap className="w-3.5 h-3.5" />
        练习模式
      </button>
      <button
        disabled={disabled}
        onClick={() => onChange('strict')}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:cursor-not-allowed',
          value === 'strict'
            ? 'bg-white text-red-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800 disabled:opacity-50',
        )}
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        严格模式
      </button>
    </div>
  )
}
