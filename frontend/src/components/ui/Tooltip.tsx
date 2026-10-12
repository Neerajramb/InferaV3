import type { ReactNode } from 'react'

import { cn } from '../../lib/format'

interface TooltipProps {
  label: ReactNode
  children: ReactNode
  side?: 'right' | 'top' | 'bottom'
  disabled?: boolean
  className?: string
}

/** CSS-only tooltip. Shows on hover after a short delay and immediately on keyboard focus. */
export function Tooltip({ label, children, side = 'top', disabled, className }: TooltipProps) {
  if (disabled) return <>{children}</>
  const position = {
    right: 'left-full top-1/2 ml-2 -translate-y-1/2 origin-left',
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2 origin-bottom',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2 origin-top',
  }[side]
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-overlay whitespace-nowrap rounded-[7px] border border-line bg-elevated px-2 py-1 text-xs font-medium text-fg shadow-pop',
          'scale-[0.97] opacity-0 transition-[opacity,transform] duration-[125ms] ease-out',
          '[@media(hover:hover)]:group-hover/tip:scale-100 [@media(hover:hover)]:group-hover/tip:opacity-100 [@media(hover:hover)]:group-hover/tip:delay-300',
          'group-has-[:focus-visible]/tip:scale-100 group-has-[:focus-visible]/tip:opacity-100',
          position,
        )}
      >
        {label}
      </span>
    </span>
  )
}
