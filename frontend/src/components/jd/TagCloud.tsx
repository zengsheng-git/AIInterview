import { clsx } from 'clsx'
import type { Skill } from '@/api/types'

const categoryStyle: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  basic: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-200',
    label: '基础',
  },
  project: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    label: '项目',
  },
  system: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    ring: 'ring-purple-200',
    label: '系统',
  },
  soft: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-200',
    label: '软技能',
  },
}

const categoryIcon: Record<string, string> = {
  basic: '📘',
  project: '💼',
  system: '🏗️',
  soft: '🤝',
}

export function TagCloud({ skills, onSelect }: { skills: Skill[]; onSelect?: (s: Skill) => void }) {
  if (!skills?.length) {
    return (
      <div className="text-sm text-slate-400 text-center py-12">暂无技能点</div>
    )
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {skills.map((s, i) => {
          const c = categoryStyle[s.category] || categoryStyle.basic
          return (
            <button
              key={i}
              onClick={() => onSelect?.(s)}
              className={clsx(
                'tag group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border',
                c.bg,
                c.text,
                'border-current/20 hover:ring-2 hover:ring-offset-1',
                c.ring,
              )}
              title={`权重 ${s.weight} / 5`}
            >
              <span className="text-sm">{categoryIcon[s.category] || '📘'}</span>
              <span>{s.name}</span>
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/60 opacity-70">
                ×{s.weight}
              </span>
            </button>
          )
        })}
      </div>
      <div className="w-full mt-4 flex items-center gap-4 text-xs text-slate-500">
        {Object.entries(categoryStyle).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                v.text.replace('text-', 'bg-'),
              )}
            />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  )
}
