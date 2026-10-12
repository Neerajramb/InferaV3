import { Link } from 'react-router-dom'
import { CompassIcon } from '@phosphor-icons/react'

import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/misc'

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        className="min-h-[60vh]"
        icon={<CompassIcon className="h-6 w-6" />}
        title="This page doesn't exist"
        description="The link may be old, or the page was moved. Head back to your dashboard to keep going."
        action={
          <Link to="/dashboard" className="inline-flex h-9 items-center rounded-control bg-accent px-4 text-sm font-medium text-on-accent transition-transform active:scale-[0.97]">
            Back to dashboard
          </Link>
        }
      />
    </Page>
  )
}
