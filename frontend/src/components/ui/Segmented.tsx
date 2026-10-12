import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'

import { cn } from '../../lib/format'

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; title?: string }[]
  className?: string
  size?: 'sm' | 'md'
}

/** Segmented control with a sliding indicator. */
export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: SegmentedProps<T>) {
  const id = useId()
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-control border border-line bg-sunken/70 p-0.5', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium transition-colors duration-150',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'text-fg' : 'text-subtle hover:text-muted',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[8px] border border-line bg-elevated shadow-panel"
                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
