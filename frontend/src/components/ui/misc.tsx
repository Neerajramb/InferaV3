import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

import { cn } from '../../lib/format'

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin text-current', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ animationDuration: '600ms' }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line bg-sunken px-1 font-mono text-[11px] text-subtle', className)}>
      {children}
    </kbd>
  )
}

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg md:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[65ch] text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Counts up once when scrolled into view. Always settles on the exact value, even if interrupted. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const final = value.toLocaleString()
    if (reduce || !inView) {
      node.textContent = reduce ? final : '0'
      return
    }
    const duration = Math.min(1100, 450 + value * 2)
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4)
      node.textContent = Math.round(eased * value).toLocaleString()
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      node.textContent = final
    }
  }, [inView, reduce, value])

  return <span ref={ref} className={cn('tabular', className)}>0</span>
}

const revealEase = [0.16, 1, 0.3, 1] as const

/** Fades children up as they enter the viewport. Use for content lists, not chrome. */
export function Reveal({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  const reduce = useReducedMotion()
  const Component = motion[as]
  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: revealEase }}
    >
      {children}
    </Component>
  )
}

/** Container + item variants for staggered lists. */
export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: revealEase } },
  },
}

export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={cn('mx-auto w-full px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10', wide ? 'max-w-[1440px]' : 'max-w-[1200px]', className)}>
      {children}
    </div>
  )
}
