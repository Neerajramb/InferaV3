import { Link } from 'react-router-dom'
import { LockKeyIcon } from '@phosphor-icons/react'

import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/misc'
import { useAuth } from '../store/auth'

export default function AccessDenied() {
  const role = useAuth((s) => s.user?.role)
  return (
    <Page>
      <EmptyState
        className="min-h-[60vh]"
        icon={<LockKeyIcon className="h-6 w-6" />}
        title="You don't have access to this page"
        description={`Your role (${role ?? 'unknown'}) can't open this area. Ask the Founder if you think you should have access.`}
        action={
          <Link to="/dashboard" className="inline-flex h-9 items-center rounded-control border border-line bg-elevated px-4 text-sm font-medium transition-transform active:scale-[0.97]">
            Back to dashboard
          </Link>
        }
      />
    </Page>
  )
}
