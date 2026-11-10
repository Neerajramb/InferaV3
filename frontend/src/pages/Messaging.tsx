import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftIcon, ArrowUpIcon, ChatsCircleIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Field'
import { SkeletonRows } from '../components/ui/Skeleton'
import { keys, useConversations, useTeam, useThread } from '../hooks/queries'
import { api, errorMessage } from '../lib/api'
import { cn, dayLabel, formatTime, relativeTime } from '../lib/format'
import type { DirectMessage } from '../lib/types'
import { useAuth } from '../store/auth'

export default function Messaging() {
  const me = useAuth((s) => s.user)!
  const [params, setParams] = useSearchParams()
  const userParam = params.get('user')
  const activeId = userParam && /^\d+$/.test(userParam) ? Number(userParam) : null
  const queryClient = useQueryClient()
  const { data: team = [], isLoading: teamLoading } = useTeam()
  const { data: conversations = [] } = useConversations()
  const thread = useThread(activeId)
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<DirectMessage[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const people = useMemo(() => {
    const byId = new Map(conversations.map((c) => [c.user_id, c]))
    const q = filter.trim().toLowerCase()
    return team
      .filter((u) => u.id !== me.id && (!q || u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)))
      .map((u) => ({ user: u, conversation: byId.get(u.id) }))
      .sort((a, b) => {
        const at = a.conversation?.last_message?.created_at ?? ''
        const bt = b.conversation?.last_message?.created_at ?? ''
        return bt.localeCompare(at) || a.user.display_name.localeCompare(b.user.display_name, undefined, { sensitivity: 'base' })
      })
  }, [team, conversations, filter, me.id])

  const active = team.find((u) => u.id === activeId) ?? null
  const messages = useMemo(() => [...(thread.data ?? []), ...pending.filter((p) => p.receiver_id === activeId)], [thread.data, pending, activeId])

  // Opening a thread marks it read on the server; refresh the badges.
  useEffect(() => {
    if (thread.dataUpdatedAt) {
      void queryClient.invalidateQueries({ queryKey: keys.unread })
      void queryClient.invalidateQueries({ queryKey: keys.conversations })
    }
  }, [thread.dataUpdatedAt, queryClient])

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages.length, activeId])

  const select = (id: number | null) => setParams(id ? { user: String(id) } : {}, { replace: true })

  const send = async (event?: FormEvent) => {
    event?.preventDefault()
    const content = draft.trim()
    if (!content || !activeId) return
    const temp: DirectMessage = { id: `p-${Date.now()}`, sender_id: me.id, receiver_id: activeId, content, is_read: false, created_at: new Date().toISOString(), pending: true }
    setPending((p) => [...p, temp])
    setDraft('')
    try {
      await api.post('/messages/', { receiver_id: activeId, content })
      await queryClient.invalidateQueries({ queryKey: keys.thread(activeId) })
      void queryClient.invalidateQueries({ queryKey: keys.conversations })
    } catch (error) {
      toast.error(errorMessage(error))
      setDraft(content)
    } finally {
      setPending((p) => p.filter((x) => x.id !== temp.id))
    }
  }

  let lastDay = ''

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-[100dvh]">
      <aside className={cn('w-full shrink-0 flex-col border-r border-line md:flex md:w-[300px]', activeId ? 'hidden' : 'flex')}>
        <div className="px-4 pb-3 pt-5">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">Messages</h1>
          <div className="mt-3">
            <Input leading={<MagnifyingGlassIcon className="h-4 w-4" />} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find someone" aria-label="Find someone" className="h-9" />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-4">
          {teamLoading && <SkeletonRows rows={6} />}
          {people.map(({ user, conversation }) => {
            const last = conversation?.last_message
            const unread = conversation?.unread ?? 0
            return (
              <li key={user.id}>
                <button
                  onClick={() => select(user.id)}
                  className={cn('flex w-full items-center gap-3 rounded-control px-2.5 py-2.5 text-left transition-colors', user.id === activeId ? 'bg-elevated' : 'hover:bg-elevated/60')}
                >
                  <Avatar name={user.display_name} seed={user.username} online={user.online} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('min-w-0 flex-1 truncate text-sm', unread ? 'font-semibold text-fg' : 'font-medium')}>{user.display_name}</span>
                      {last && <span className="shrink-0 text-[11px] text-subtle">{relativeTime(last.created_at)}</span>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cn('min-w-0 flex-1 truncate text-[13px]', unread ? 'text-fg' : 'text-subtle')}>
                        {last ? `${last.sender_id === me.id ? 'You: ' : ''}${last.content}` : user.role}
                      </span>
                      {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent tabular">{unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
          {!teamLoading && !people.length && <p className="px-3 py-8 text-center text-sm text-subtle">No one matches that name.</p>}
        </ul>
      </aside>

      <section className={cn('min-w-0 flex-1 flex-col', activeId ? 'flex' : 'hidden md:flex')}>
        {!active ? (
          <EmptyState className="flex-1" icon={<ChatsCircleIcon className="h-6 w-6" />} title="Pick someone to message" description="Direct messages are only visible to you and the person you are talking to." />
        ) : (
          <>
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
              <button onClick={() => select(null)} className="-ml-1 flex h-9 w-9 items-center justify-center rounded-control text-muted hover:bg-elevated md:hidden" aria-label="Back to people">
                <ArrowLeftIcon />
              </button>
              <Avatar name={active.display_name} seed={active.username} online={active.online} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{active.display_name}</p>
                <p className="text-xs text-subtle">{active.role}, {active.online ? 'active now' : `last seen ${relativeTime(active.last_seen)}`}</p>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              {thread.isLoading ? (
                <SkeletonRows rows={4} />
              ) : !messages.length ? (
                <p className="py-16 text-center text-sm text-subtle">No messages yet. Say hello to {active.first_name || active.display_name}.</p>
              ) : (
                <ol className="mx-auto max-w-2xl space-y-1.5">
                  <AnimatePresence initial={false}>
                    {messages.map((message, index) => {
                      const mine = message.sender_id === me.id
                      const day = dayLabel(message.created_at)
                      const showDay = day !== lastDay
                      lastDay = day
                      const next = messages[index + 1]
                      const tail = !next || next.sender_id !== message.sender_id
                      return (
                        <motion.li key={message.id} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
                          {showDay && <p className="py-4 text-center text-xs font-medium text-subtle">{day}</p>}
                          <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[78%] whitespace-pre-wrap break-words rounded-[16px] px-3.5 py-2 text-[14.5px] leading-6',
                                mine ? 'bg-accent text-on-accent' : 'bg-elevated text-fg ring-1 ring-line',
                                tail && (mine ? 'rounded-br-[5px]' : 'rounded-bl-[5px]'),
                                message.pending && 'opacity-60',
                              )}
                              title={formatTime(message.created_at)}
                            >
                              {message.content}
                            </div>
                          </div>
                          {tail && <p className={cn('mt-1 px-1 text-[11px] text-subtle', mine && 'text-right')}>{message.pending ? 'Sending' : formatTime(message.created_at)}</p>}
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ol>
              )}
            </div>

            <form onSubmit={send} className="shrink-0 px-4 pb-4 sm:px-8">
              <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-[16px] border border-line bg-surface p-2 shadow-panel focus-within:border-line-strong">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                  rows={1}
                  placeholder={`Message ${active.first_name || active.display_name}`}
                  aria-label="Message"
                  className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-6 text-fg placeholder:text-subtle focus:outline-none [field-sizing:content]"
                />
                <button type="submit" disabled={!draft.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-on-accent transition-[transform,opacity] active:scale-[0.94] disabled:opacity-30" aria-label="Send">
                  <ArrowUpIcon weight="bold" className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
