import type { ReactNode } from 'react'
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'

import { cn } from '../../lib/format'
import type { IndexStatus, ProjectRole, Role } from '../../lib/types'
import { Spinner } from './misc'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-elevated text-muted border-line',
  accent: 'bg-accent/10 text-accent-ink border-accent/25',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
}

export function Badge({ children, tone = 'neutral', className, icon }: { children: ReactNode; tone?: Tone; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-chip border px-2 text-xs font-medium', tones[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

export function StatusBadge({ status, error }: { status: IndexStatus; error?: string }) {
  if (status === 'ready') return <Badge tone="success" icon={<CheckCircleIcon weight="fill" className="h-3.5 w-3.5" />}>Indexed</Badge>
  if (status === 'failed')
    return (
      <span title={error}>
        <Badge tone="danger" icon={<WarningCircleIcon weight="fill" className="h-3.5 w-3.5" />}>Failed</Badge>
      </span>
    )
  return (
    <Badge tone="warning" icon={<Spinner className="h-3 w-3" />}>
      {status === 'processing' ? 'Indexing' : 'Queued'}
    </Badge>
  )
}

const roleTone: Record<Role, Tone> = { Founder: 'accent', HR: 'neutral', PM: 'neutral', Employee: 'neutral' }

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={roleTone[role]}>{role}</Badge>
}

export function ProjectRoleBadge({ role }: { role: ProjectRole | null }) {
  if (!role) return null
  const label = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' }[role]
  return <Badge tone={role === 'owner' ? 'accent' : 'neutral'}>{label}</Badge>
}
