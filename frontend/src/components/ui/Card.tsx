import { clsx } from 'clsx'
import { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode
  subtitle?: ReactNode
  extra?: ReactNode
  variant?: 'default' | 'gradient' | 'glass' | 'elevated'
  icon?: ReactNode
}

export function Card({
  title,
  subtitle,
  extra,
  variant = 'default',
  icon,
  className,
  children,
  ...props
}: Props) {
  const variantClass = {
    default: 'bg-white shadow-card',
    elevated: 'bg-white shadow-elevated',
    glass: 'glass shadow-card',
    gradient: 'bg-white shadow-glow gradient-border',
  }[variant]

  return (
    <div
      className={clsx(
        'rounded-2xl overflow-hidden transition-all duration-200',
        variantClass,
        className,
      )}
      {...props}
    >
      {(title || extra) && (
        <div className="px-5 py-4 border-b border-gray-100/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-slate-800 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {extra && <div className="flex-shrink-0">{extra}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
