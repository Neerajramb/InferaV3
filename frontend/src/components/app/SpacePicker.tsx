import { LockSimpleIcon, StackIcon, SquaresFourIcon } from '@phosphor-icons/react'

import type { Space } from '../../hooks/queries'
import { cn } from '../../lib/format'
import type { Project } from '../../lib/types'
import { Select } from '../ui/Field'

interface SpacePickerProps {
  value: Space
  onChange: (space: Space) => void
  projects: Project[]
  allowAll?: boolean
}

/** Personal space plus every project the user can see. */
export function SpacePicker({ value, onChange, projects, allowAll }: SpacePickerProps) {
  const options = [
    ...(allowAll ? [{ value: 'all' as Space, label: 'Everything', icon: <SquaresFourIcon className="h-4 w-4" />, meta: '' }] : []),
    { value: 'personal' as Space, label: 'Personal', icon: <LockSimpleIcon className="h-4 w-4" />, meta: 'Only you' },
    ...projects.map((p) => ({ value: p.id as Space, label: p.name, icon: <StackIcon className="h-4 w-4" />, meta: p.can_contribute ? '' : 'View only' })),
  ]
  return (
    <>
      <div className="lg:hidden">
        <Select value={String(value)} onChange={(e) => onChange(/^\d+$/.test(e.target.value) ? Number(e.target.value) : (e.target.value as Space))} aria-label="Space">
          {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </Select>
      </div>
      <div className="hidden lg:block">
        <p className="mb-1 px-1 text-xs font-medium text-subtle">Spaces</p>
        <ul className="space-y-px">
          {options.map((option) => {
            const active = option.value === value
            return (
              <li key={String(option.value)}>
                <button
                  onClick={() => onChange(option.value)}
                  className={cn('flex h-8 w-full items-center gap-2 rounded-[8px] px-2.5 text-left text-sm transition-colors', active ? 'bg-elevated text-fg' : 'text-muted hover:bg-elevated/60 hover:text-fg')}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className={cn(active && 'text-accent-ink')}>{option.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.meta && <span className="shrink-0 text-[11px] text-subtle">{option.meta}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
