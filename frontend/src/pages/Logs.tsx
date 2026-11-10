import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDownIcon, FingerprintIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

import { describeLog } from '../components/app/ActivityItem'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { Page, PageHeader } from '../components/ui/misc'
import { SkeletonRows } from '../components/ui/Skeleton'
import { useLogActions, useLogs } from '../hooks/queries'
import { errorMessage } from '../lib/api'
import { cn, dayLabel, formatTime } from '../lib/format'
import type { LogEntry } from '../lib/types'

function LogRow({ log, onUser }: { log: LogEntry; onUser: (username: string) => void }) {
  const [open, setOpen] = useState(false)
  const { icon: Icon, text } = describeLog(log)
  const hasMeta = Object.keys(log.metadata ?? {}).length > 0
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-line bg-sunken text-muted">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 text-muted">
            {log.username ? (
              <button onClick={() => onUser(log.username!)} className="inline-flex items-center gap-1.5 font-medium text-fg hover:underline">
                <Avatar name={log.display_name ?? log.username} seed={log.username} size="xs" className="translate-y-[1px]" />
                {log.display_name ?? log.username}
              </button>
            ) : (
              <span className="font-medium text-fg">System</span>
            )}{' '}
            {text}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-subtle">
            {log.action}
            {log.role ? `, ${log.role}` : ''}
          </p>
          <AnimatePresence initial={false}>
            {open && (
              <motion.pre
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="mt-2 overflow-hidden overflow-x-auto rounded-control border border-line bg-sunken p-3 font-mono text-xs leading-5 text-muted"
              >
                {JSON.stringify(log.metadata, null, 2)}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
        <span className="shrink-0 text-xs text-subtle tabular">{formatTime(log.timestamp)}</span>
        {hasMeta && (
          <button onClick={() => setOpen((v) => !v)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-subtle hover:bg-elevated hover:text-fg" aria-expanded={open} aria-label="Show details">
            <CaretDownIcon className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
          </button>
        )}
      </div>
    </li>
  )
}

export default function Logs() {
  const [action, setAction] = useState('')
  const [user, setUser] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const { data: actions = [] } = useLogActions()

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    if (action) f.action = action
    if (user) f.user = user
    if (debounced) f.q = debounced
    return f
  }, [action, user, debounced])

  const logs = useLogs(filters)
  const entries = logs.data?.pages.flatMap((p) => p.results) ?? []
  const total = logs.data?.pages[0]?.count ?? 0
  const groups = useMemo(() => {
    const out: { day: string; items: LogEntry[] }[] = []
    for (const entry of entries) {
      const day = dayLabel(entry.timestamp)
      const last = out[out.length - 1]
      if (last?.day === day) last.items.push(entry)
      else out.push({ day, items: [entry] })
    }
    return out
  }, [entries])

  return (
    <Page>
      <PageHeader title="Audit log" description="Every sign-in, upload, deletion, permission change and question, newest first. Only the Founder can see everyone's activity." />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-56">
          <Select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action">
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>
        <div className="flex-1">
          <Input leading={<MagnifyingGlassIcon className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions or usernames" aria-label="Search the audit log" />
        </div>
        {user && (
          <button onClick={() => setUser('')} className="inline-flex h-10 items-center gap-2 rounded-control border border-accent/30 bg-accent/10 px-3 text-sm text-accent-ink">
            {user} <XIcon className="h-3.5 w-3.5" />
            <span className="sr-only">Clear user filter</span>
          </button>
        )}
      </div>

      <p className="mt-4 text-[13px] text-subtle tabular">{logs.isLoading ? 'Loading' : `${total.toLocaleString()} ${total === 1 ? 'event' : 'events'}`}</p>

      <div className="mt-2">
        {logs.error ? (
          <ErrorState message={errorMessage(logs.error)} onRetry={() => void logs.refetch()} />
        ) : logs.isLoading ? (
          <SkeletonRows rows={8} />
        ) : !entries.length ? (
          <EmptyState className="rounded-panel border border-dashed border-line" icon={<FingerprintIcon className="h-6 w-6" />} title="No events match" description="Clear a filter to see more." />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.day}>
                <h2 className="sticky top-14 z-10 bg-bg/90 py-2 text-xs font-medium text-subtle backdrop-blur lg:top-0">{group.day}</h2>
                <ul className="divide-y divide-line rounded-panel border border-line bg-surface shadow-panel">
                  {group.items.map((log) => <LogRow key={log.id} log={log} onUser={setUser} />)}
                </ul>
              </section>
            ))}
            {logs.hasNextPage && (
              <div className="flex justify-center">
                <Button loading={logs.isFetchingNextPage} onClick={() => void logs.fetchNextPage()}>Load older events</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  )
}
