import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { api, errorMessage } from '../../lib/api'
import { cn } from '../../lib/format'
import { ROLE_SUMMARY, ROLES } from '../../lib/rbac'
import type { Me, Role } from '../../lib/types'
import { useAuth } from '../../store/auth'
import { Dialog } from '../ui/Overlay'
import { Spinner } from '../ui/misc'

/** Development-only: the server rejects this unless ALLOW_ROLE_SWITCH is on. */
export function RoleSwitchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuth((s) => s.user)
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<Role | null>(null)

  const switchTo = async (role: Role) => {
    setPending(role)
    try {
      const { data } = await api.patch<Me>('/auth/profile/update-role/', { role })
      useAuth.getState().setUser(data)
      await queryClient.invalidateQueries()
      toast.success(`You are now previewing Infera as ${role}.`)
      onClose()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Preview another role" description="A development tool for checking what each role can see. It changes your own account's role.">
      <div className="space-y-1.5">
        {ROLES.map((role) => {
          const current = user?.role === role
          return (
            <button
              key={role}
              onClick={() => !current && void switchTo(role)}
              disabled={!!pending}
              className={cn(
                'flex w-full items-start gap-3 rounded-control border px-3.5 py-3 text-left transition-colors',
                current ? 'border-accent/40 bg-accent/[0.06]' : 'border-line hover:border-line-strong hover:bg-elevated',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">{role}</span>
                <span className="mt-0.5 block text-[13px] leading-5 text-muted">{ROLE_SUMMARY[role]}</span>
              </span>
              {pending === role ? <Spinner className="mt-0.5 h-4 w-4" /> : current ? <CheckIcon className="mt-0.5 h-4 w-4 text-accent-ink" /> : null}
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}
