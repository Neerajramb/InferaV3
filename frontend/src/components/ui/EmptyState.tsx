import type { ReactNode } from 'react'

import { cn } from '../../lib/format'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] border border-line bg-elevated text-muted shadow-inset">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-control border border-danger/25 bg-danger/[0.06] px-4 py-3 text-sm text-danger" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-medium underline underline-offset-4 hover:no-underline">
          Try again
        </button>
      )}
    </div>
  )
}
