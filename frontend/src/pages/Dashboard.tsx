import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRightIcon,
  ArrowUpIcon,
  BooksIcon,
  ChatTeardropTextIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  SparkleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'

import { describeLog } from '../components/app/ActivityItem'
import { AssistantDot, assistantLabel } from '../components/app/AssistantStatus'
import { QueryChart } from '../components/app/QueryChart'
import { Avatar } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { EmptyState, ErrorState } from '../components/ui/EmptyState'
import { CountUp, Page, stagger } from '../components/ui/misc'
import { Skeleton } from '../components/ui/Skeleton'
import { useDashboard } from '../hooks/queries'
import { errorMessage } from '../lib/api'
import { cn, greeting, relativeTime } from '../lib/format'
import type { Dashboard as DashboardData } from '../lib/types'

function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.section variants={stagger.item} className={cn('rounded-panel border border-line bg-surface p-5 shadow-panel', className)}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </motion.section>
  )
}

function QuickAsk() {
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim()) navigate(`/chat?new=1&q=${encodeURIComponent(value.trim())}`)
  }
  return (
    <form onSubmit={submit} className="group relative w-full max-w-xl">
      <SparkleIcon weight="fill" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-accent-ink" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask anything about your documents"
        aria-label="Ask Infera a question"
        className="h-12 w-full rounded-[12px] border border-line bg-surface pl-11 pr-14 text-[15px] text-fg shadow-panel transition-[border-color,box-shadow] placeholder:text-subtle hover:border-line-strong focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/10"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[9px] bg-accent text-on-accent transition-[transform,opacity] active:scale-[0.94] disabled:opacity-30"
        aria-label="Ask"
      >
        <ArrowUpIcon weight="bold" className="h-4 w-4" />
      </button>
    </form>
  )
}

function Metrics({ data }: { data: DashboardData }) {
  const items = [
    { label: 'Projects', value: data.stats.projects, to: '/projects' },
    { label: 'Documents', value: data.stats.documents, to: '/documents?space=all' },
    { label: 'Notes', value: data.stats.notes, to: '/notes?space=all' },
    { label: data.user.role === 'Founder' ? 'Questions, all users' : 'Questions asked', value: data.stats.queries, to: '/chat' },
    ...(data.stats.team !== null ? [{ label: 'People', value: data.stats.team, to: '/team' }] : []),
  ]
  return (
    <motion.div variants={stagger.item} className="grid grid-cols-2 overflow-hidden rounded-panel border border-line bg-surface shadow-panel sm:grid-cols-3 lg:flex">
      {items.map((item) => (
        <Link key={item.label} to={item.to} className="group flex-1 border-b border-r border-line px-5 py-4 transition-colors last:border-r-0 hover:bg-elevated/50 lg:border-b-0">
          <p className="text-[13px] text-muted transition-colors group-hover:text-fg">{item.label}</p>
          <CountUp value={item.value} className="mt-1 block text-[28px] font-semibold tracking-[-0.02em] text-fg" />
        </Link>
      ))}
    </motion.div>
  )
}

function IndexHealth({ data }: { data: DashboardData }) {
  const { ready, pending, processing, failed } = data.index
  const total = ready + pending + processing + failed
  const indexing = pending + processing
  const rows = [
    { label: 'Indexed', value: ready, icon: <CheckCircleIcon weight="fill" className="h-4 w-4 text-success" />, bar: 'bg-success' },
    { label: 'Indexing', value: indexing, icon: <CircleNotchIcon className="h-4 w-4 animate-spin text-warning" />, bar: 'bg-warning' },
    { label: 'Failed', value: failed, icon: <WarningCircleIcon weight="fill" className="h-4 w-4 text-danger" />, bar: 'bg-danger' },
  ]
  if (!total) return <p className="text-sm text-muted">No documents yet. Upload one and it will be searchable in a few seconds.</p>
  return (
    <div>
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${ready} indexed, ${indexing} indexing, ${failed} failed`}>
        {rows.filter((r) => r.value).map((row) => (
          <motion.span key={row.label} className={cn('h-full', row.bar)} initial={{ flexGrow: 0 }} animate={{ flexGrow: row.value }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2.5 text-sm">
            {row.icon}
            <span className="flex-1 text-muted">{row.label}</span>
            <span className="font-medium tabular">{row.value}</span>
          </li>
        ))}
      </ul>
      {failed > 0 && (
        <Link to="/documents?space=all" className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink hover:underline">
          Review failed files <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[86px] w-full rounded-panel" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-panel lg:col-span-2" />
        <Skeleton className="h-64 rounded-panel" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-72 rounded-panel" />
        <Skeleton className="h-72 rounded-panel" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard()
  const firstName = data?.user.first_name || data?.user.display_name
  const assistant = assistantLabel(data?.assistant)

  return (
    <Page>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] md:text-[34px]">
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1.5 text-sm text-muted">Here is what is happening across the projects you can see.</p>
        </div>
        <QuickAsk />
      </header>

      <div className="mt-8">
        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : isLoading || !data ? (
          <DashboardSkeleton />
        ) : (
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-5">
            <Metrics data={data} />

            <div className="grid gap-5 lg:grid-cols-3">
              <Panel title="Questions per day" className="lg:col-span-2" action={<span className="text-xs text-subtle">Last 14 days</span>}>
                <QueryChart data={data.query_series} />
              </Panel>
              <div className="grid gap-5">
                <Panel title="Index health">
                  <IndexHealth data={data} />
                </Panel>
                <Panel title="Assistant">
                  <div className="flex items-center gap-2.5">
                    <AssistantDot status={data.assistant} />
                    <span className="text-sm font-medium">{assistant.title}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-5 text-muted">{assistant.detail}</p>
                </Panel>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <Panel title="Recently added" action={<Link to="/documents?space=all" className="text-[13px] text-muted hover:text-fg">View all</Link>}>
                {data.recent_documents.length ? (
                  <ul className="-mx-2">
                    {data.recent_documents.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-elevated/60">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-line bg-sunken font-mono text-[10px] uppercase text-muted">{doc.extension || 'doc'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{doc.title}</p>
                          <p className="truncate text-xs text-subtle">
                            {doc.project_name ?? 'Personal'} · {relativeTime(doc.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={doc.status} error={doc.error} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState className="py-8" icon={<BooksIcon className="h-5 w-5" />} title="Nothing uploaded yet" description="PDFs, Word files, Markdown and text are indexed automatically." action={<Link to="/documents?upload=1" className="text-sm font-medium text-accent-ink hover:underline">Upload a document</Link>} />
                )}
              </Panel>

              <div className="grid gap-5">
                <Panel title="Recent chats" action={<Link to="/chat?new=1" className="text-[13px] text-muted hover:text-fg">New chat</Link>}>
                  {data.recent_sessions.length ? (
                    <ul className="-mx-2">
                      {data.recent_sessions.map((session) => (
                        <li key={session.id}>
                          <Link to={`/chat?session=${session.id}`} className="flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-elevated/60">
                            <ChatTeardropTextIcon className="h-4 w-4 shrink-0 text-subtle" />
                            <span className="min-w-0 flex-1 truncate text-sm">{session.title}</span>
                            <span className="text-xs text-subtle">{relativeTime(session.updated_at)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">Your conversations with Infera will show up here.</p>
                  )}
                </Panel>

                <Panel title="Activity" action={data.user.role === 'Founder' ? <Link to="/logs" className="text-[13px] text-muted hover:text-fg">Audit log</Link> : undefined}>
                  <ul className="space-y-3">
                    {data.recent_activity.slice(0, 6).map((log) => {
                      const { icon: Icon, text } = describeLog(log)
                      return (
                        <li key={log.id} className="flex items-start gap-3 text-sm">
                          {log.username ? <Avatar name={log.username} size="xs" className="mt-0.5" /> : <Icon className="mt-0.5 h-5 w-5 text-subtle" />}
                          <p className="min-w-0 flex-1 leading-5 text-muted">
                            <span className="font-medium text-fg">{log.username ?? 'System'}</span> {text}
                          </p>
                          <span className="shrink-0 text-xs text-subtle">{relativeTime(log.timestamp)}</span>
                        </li>
                      )
                    })}
                    {!data.recent_activity.length && <p className="text-sm text-muted">No activity yet.</p>}
                  </ul>
                </Panel>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Page>
  )
}
