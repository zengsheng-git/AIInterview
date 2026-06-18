import { clsx } from 'clsx'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      block,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'
    const variants = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md',
      secondary:
        'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
      ghost: 'text-slate-600 hover:bg-slate-100',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
      gradient:
        'text-white shadow-md hover:shadow-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
      xl: 'px-6 py-3 text-base font-semibold',
    }
    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], block && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
