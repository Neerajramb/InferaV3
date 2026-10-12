import { cn } from '../../lib/format'

/** Three stacked bars: documents narrowing into an answer. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-accent text-on-accent', className)} aria-hidden="true">
      <span className="flex w-[15px] flex-col gap-[2.5px]">
        <span className="h-[3px] w-full rounded-full bg-current" />
        <span className="h-[3px] w-[68%] rounded-full bg-current opacity-80" />
        <span className="h-[3px] w-[38%] rounded-full bg-current opacity-60" />
      </span>
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Infera</span>
    </span>
  )
}
