import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

import { cn } from '../../lib/format'

interface Point {
  date: string
  count: number
}

const dayFormat = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/**
 * Single-series bar chart of questions per day. One series, so no legend; the
 * panel title names it. Colors come from the validated --chart token.
 */
export function QueryChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const peak = Math.max(...data.map((d) => d.count), 1)
  // An even top keeps the middle gridline on a whole number.
  const max = peak === 1 ? 1 : Math.ceil(peak / 2) * 2
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const ticks = max === 1 ? [1, 0] : [max, max / 2, 0]

  return (
    <figure className="relative flex flex-1 flex-col">
      <div className="flex min-h-44 flex-1 gap-3">
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] text-subtle tabular" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{tick}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 h-px bg-line/60" aria-hidden="true" />
          {max > 1 && <div className="absolute inset-x-0 top-[calc(50%-12px)] h-px bg-line/60" aria-hidden="true" />}
          <div className="absolute inset-x-0 bottom-6 flex h-[calc(100%-1.5rem)] items-end gap-[3px] border-b border-line-strong" onMouseLeave={() => setHover(null)}>
            {data.map((point, index) => (
              <div
                key={point.date}
                className="group relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${dayFormat(point.date)}: ${point.count} questions`}
              >
                <motion.div
                  className={cn('w-full rounded-t-[4px] bg-chart transition-opacity duration-150', hover !== null && hover !== index && 'opacity-45')}
                  style={{ height: `${Math.max((point.count / max) * 100, point.count ? 4 : 1.5)}%`, transformOrigin: 'bottom' }}
                  initial={reduce ? false : { scaleY: 0.04, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: point.count ? 1 : 0.35 }}
                  transition={{ duration: 0.6, delay: index * 0.025, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-subtle" aria-hidden="true">
            <span>{dayFormat(data[0]?.date ?? '')}</span>
            <span>{dayFormat(data[Math.floor(data.length / 2)]?.date ?? '')}</span>
            <span>Today</span>
          </div>
          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute -top-2 z-overlay -translate-x-1/2 -translate-y-full rounded-[8px] border border-line bg-elevated px-2.5 py-1.5 text-xs shadow-pop"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <p className="text-subtle">{dayFormat(data[hover].date)}</p>
              <p className="mt-0.5 font-medium text-fg tabular">{data[hover].count} {data[hover].count === 1 ? 'question' : 'questions'}</p>
            </div>
          )}
        </div>
      </div>
      {total === 0 && (
        <p className="absolute inset-x-12 top-1/3 text-center text-sm text-muted">No questions in the last two weeks.</p>
      )}
      <table className="sr-only">
        <caption>Questions asked per day, last 14 days</caption>
        <thead><tr><th>Date</th><th>Questions</th></tr></thead>
        <tbody>{data.map((p) => <tr key={p.date}><td>{dayFormat(p.date)}</td><td>{p.count}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
