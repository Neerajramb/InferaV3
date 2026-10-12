import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import {
  ArrowUpIcon,
  DotsThreeIcon,
  FunnelSimpleIcon,
  ListIcon,
  NotePencilIcon,
  PencilSimpleIcon,
  SparkleIcon,
  StopIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

import { AssistantDot, assistantLabel } from '../components/app/AssistantStatus'
import { MessageView } from '../components/chat/MessageView'
import { EMPTY_SCOPE, ScopePicker, scopeLabel } from '../components/chat/ScopePicker'
import { Button } from '../components/ui/Button'
import { confirm } from '../components/ui/Confirm'
import { ErrorState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Field'
import { Menu } from '../components/ui/Menu'
import { Kbd } from '../components/ui/misc'
import { Dialog, Sheet } from '../components/ui/Overlay'
import { Skeleton } from '../components/ui/Skeleton'
import { keys, useDocuments, useProjects, useSession, useSessions, useSystemStatus } from '../hooks/queries'
import { api, errorMessage } from '../lib/api'
import { cn, dayLabel } from '../lib/format'
import { streamChat, type StreamMeta } from '../lib/sse'
import type { ChatMessage, ChatScope, ChatSession } from '../lib/types'

const STREAM_ID = 'streaming'

function groupSessions(sessions: ChatSession[]) {
  const groups: { label: string; items: ChatSession[] }[] = []
  for (const session of sessions) {
    const label = dayLabel(session.updated_at)
    const group = groups.find((g) => g.label === label)
    if (group) group.items.push(session)
    else groups.push({ label, items: [session] })
  }
  return groups
}

interface SessionListProps {
  sessions: ChatSession[]
  loading: boolean
  activeId: number | null
  onSelect: (id: number) => void
  onNew: () => void
  onRename: (session: ChatSession) => void
  onDelete: (session: ChatSession) => void
}

function SessionList({ sessions, loading, activeId, onSelect, onNew, onRename, onDelete }: SessionListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button variant="secondary" className="w-full justify-start" icon={<NotePencilIcon className="h-4 w-4" />} onClick={onNew}>
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loading && <div className="space-y-2 px-1">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div>}
        {!loading && !sessions.length && <p className="px-2 py-6 text-sm text-subtle">Your past conversations will be listed here.</p>}
        {groupSessions(sessions).map((group) => (
          <div key={group.label} className="mt-3 first:mt-0">
            <p className="px-2 pb-1 text-xs font-medium text-subtle">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((session) => (
                <li key={session.id} className="group relative">
                  <button
                    onClick={() => onSelect(session.id)}
                    className={cn(
                      'flex h-9 w-full items-center rounded-control pl-2.5 pr-9 text-left text-sm transition-colors',
                      session.id === activeId ? 'bg-elevated text-fg' : 'text-muted hover:bg-elevated/60 hover:text-fg',
                    )}
                    aria-current={session.id === activeId ? 'page' : undefined}
                  >
                    <span className="truncate">{session.title}</span>
                  </button>
                  <Menu
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    items={[
                      { label: 'Rename', icon: <PencilSimpleIcon />, onSelect: () => onRename(session) },
                      { label: 'Delete', icon: <TrashIcon />, onSelect: () => onDelete(session), danger: true },
                    ]}
                    trigger={(props) => (
                      <button
                        {...props}
                        className="flex h-7 w-7 items-center justify-center rounded-[7px] text-subtle opacity-100 transition-opacity hover:bg-sunken hover:text-fg focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                        aria-label={`Options for ${session.title}`}
                      >
                        <DotsThreeIcon weight="bold" className="h-4 w-4" />
                      </button>
                    )}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChat({ onPick, scopeText }: { onPick: (text: string) => void; scopeText: string }) {
  const { data: docs = [] } = useDocuments('all')
  const ready = docs.filter((d) => d.status === 'ready').slice(0, 2)
  const suggestions = [
    ...ready.map((d, i) => (i === 0 ? `Summarize ${d.title}` : `What are the main points in ${d.title}?`)),
    'List the deadlines and dates mentioned in my documents',
    'Who is responsible for what, according to our policies?',
  ].slice(0, 4)

  return (
    <div className="flex min-h-full flex-col justify-center py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-accent/25 bg-accent/10 text-accent-ink">
          <SparkleIcon weight="fill" className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.025em]">What do you want to find out?</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          Infera answers from {scopeText.toLowerCase()} and cites every passage it uses.
        </p>
      </motion.div>
      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        {suggestions.map((text, i) => (
          <motion.button
            key={text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onPick(text)}
            className="rounded-control border border-line bg-surface px-4 py-3 text-left text-sm leading-5 text-muted transition-[border-color,color,transform] duration-150 hover:border-line-strong hover:text-fg active:scale-[0.98]"
          >
            {text}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default function Chat() {
  const [params, setParams] = useSearchParams()
  const sessionParam = params.get('session')
  const sessionId = sessionParam && /^\d+$/.test(sessionParam) ? Number(sessionParam) : null
  const queryClient = useQueryClient()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [scope, setScope] = useState<ChatScope>(() => {
    const project = params.get('project')
    return project ? { ...EMPTY_SCOPE, project_id: Number(project) } : EMPTY_SCOPE
  })
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [renaming, setRenaming] = useState<ChatSession | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const { data: sessions = [], isLoading: sessionsLoading } = useSessions()
  const { data: session, isLoading: sessionLoading, error: sessionError } = useSession(streaming ? null : sessionId)
  const { data: projects = [] } = useProjects()
  const { data: system } = useSystemStatus()

  const scrollRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSentRef = useRef(false)
  messagesRef.current = messages

  // Which session's messages are on screen. History is only loaded when switching to a
  // different session, so local state from an in-flight answer is never overwritten.
  const shownSessionRef = useRef<number | null | undefined>(undefined)

  useEffect(() => {
    if (streaming) return
    if (sessionId === null) {
      if (shownSessionRef.current !== null) {
        setMessages([])
        shownSessionRef.current = null
      }
      return
    }
    if (shownSessionRef.current === sessionId) return
    if (session && session.id === sessionId) {
      setMessages(session.messages ?? [])
      setScope({
        project_id: session.project,
        folder_ids: session.selected_folder_ids,
        document_ids: session.selected_document_ids,
        note_ids: session.selected_note_ids,
      })
      shownSessionRef.current = sessionId
    }
  }, [sessionId, session, streaming])

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (node && stickRef.current) node.scrollTop = node.scrollHeight
  }, [messages])

  const onScroll = () => {
    const node = scrollRef.current
    if (node) stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120
  }

  const resizeTextarea = () => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`
  }
  useLayoutEffect(resizeTextarea, [input])

  const send = useCallback(
    async (raw: string) => {
      const query = raw.trim()
      if (!query || streaming) return
      setError(null)
      setInput('')
      stickRef.current = true
      const now = new Date().toISOString()
      const tempUserId = `u-${Date.now()}`
      setMessages((m) => [
        ...m,
        { id: tempUserId, role: 'user', content: query, sources: [], created_at: now },
        { id: STREAM_ID, role: 'ai', content: '', sources: [], created_at: now },
      ])
      setStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller
      let meta: StreamMeta | null = null

      try {
        await streamChat(
          { query, session_id: sessionId, ...scope },
          {
            onMeta: (data) => {
              meta = data
              shownSessionRef.current = data.session_id
              setMessages((m) => m.map((x) => (x.id === tempUserId ? data.user_message : x.id === STREAM_ID ? { ...x, sources: data.sources } : x)))
              if (data.session_id !== sessionId) setParams({ session: String(data.session_id) }, { replace: true })
              void queryClient.invalidateQueries({ queryKey: keys.sessions })
            },
            onToken: (token) => setMessages((m) => m.map((x) => (x.id === STREAM_ID ? { ...x, content: x.content + token } : x))),
            onDone: (message) => setMessages((m) => m.map((x) => (x.id === STREAM_ID ? message : x))),
          },
          controller.signal,
        )
      } catch (err) {
        if (controller.signal.aborted) {
          setMessages((m) => m.flatMap((x) => (x.id !== STREAM_ID ? [x] : x.content ? [{ ...x, id: `ai-${Date.now()}` }] : [])))
        } else {
          setMessages((m) => m.filter((x) => x.id !== STREAM_ID && (meta || x.id !== tempUserId)))
          if (!meta) setInput(query)
          setError(err instanceof Error ? err.message : errorMessage(err))
        }
      } finally {
        const finalMeta = meta as StreamMeta | null
        if (finalMeta) {
          const current = messagesRef.current.filter((x) => x.id !== STREAM_ID)
          queryClient.setQueryData<ChatSession>(keys.session(finalMeta.session_id), (old) => ({
            ...(old ?? {
              id: finalMeta.session_id,
              project: scope.project_id,
              selected_folder_ids: scope.folder_ids,
              selected_document_ids: scope.document_ids,
              selected_note_ids: scope.note_ids,
              created_at: now,
            }),
            title: finalMeta.title,
            message_count: current.length,
            updated_at: new Date().toISOString(),
            messages: current,
          }) as ChatSession)
        }
        abortRef.current = null
        setStreaming(false)
        void queryClient.invalidateQueries({ queryKey: keys.sessions })
        void queryClient.invalidateQueries({ queryKey: keys.dashboard })
      }
    },
    [queryClient, scope, sessionId, setParams, streaming],
  )

  // Deep link: /chat?q=... sends the question once.
  useEffect(() => {
    const q = params.get('q')
    if (q && !autoSentRef.current) {
      autoSentRef.current = true
      const next = new URLSearchParams(params)
      next.delete('q')
      setParams(next, { replace: true })
      void send(q)
    }
  }, [params, send, setParams])

  const startNew = () => {
    abortRef.current?.abort()
    setParams({ new: '1' })
    setScope(EMPTY_SCOPE)
    setError(null)
    setSessionsOpen(false)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const selectSession = (id: number) => {
    if (id === sessionId) return setSessionsOpen(false)
    if (streaming) abortRef.current?.abort()
    shownSessionRef.current = undefined
    setMessages([])
    setParams({ session: String(id) })
    setError(null)
    setSessionsOpen(false)
  }

  const deleteSession = async (target: ChatSession) => {
    const ok = await confirm({ title: 'Delete this chat?', description: `"${target.title}" and its answers will be removed. This can't be undone.`, confirmLabel: 'Delete chat', danger: true })
    if (!ok) return
    try {
      await api.delete(`/chat/sessions/${target.id}/`)
      queryClient.setQueryData<ChatSession[]>(keys.sessions, (old) => old?.filter((s) => s.id !== target.id))
      if (target.id === sessionId) startNew()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const saveRename = async (event: FormEvent) => {
    event.preventDefault()
    if (!renaming || !renameValue.trim()) return
    try {
      await api.patch(`/chat/sessions/${renaming.id}/`, { title: renameValue.trim() })
      await queryClient.invalidateQueries({ queryKey: keys.sessions })
      setRenaming(null)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(input)
    }
  }

  const projectName = projects.find((p) => p.id === scope.project_id)?.name
  const scopeText = scopeLabel(scope, projectName)
  const scoped = scope.project_id !== null || scope.folder_ids.length + scope.document_ids.length + scope.note_ids.length > 0
  const title = sessionId ? sessions.find((s) => s.id === sessionId)?.title ?? session?.title ?? 'Chat' : 'New chat'
  const assistant = assistantLabel(system?.assistant)
  const loadingHistory = sessionId !== null && sessionLoading && !messages.length

  const sessionListProps = useMemo(
    () => ({
      sessions,
      loading: sessionsLoading,
      activeId: sessionId,
      onSelect: selectSession,
      onNew: startNew,
      onRename: (s: ChatSession) => {
        setRenaming(s)
        setRenameValue(s.title)
      },
      onDelete: (s: ChatSession) => void deleteSession(s),
    }),
    [sessions, sessionsLoading, sessionId, streaming],
  )

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-[100dvh]">
      <aside className="hidden w-[264px] shrink-0 border-r border-line bg-surface/40 md:block">
        <SessionList {...sessionListProps} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
          <button onClick={() => setSessionsOpen(true)} className="-ml-1 flex h-9 w-9 items-center justify-center rounded-control text-muted hover:bg-elevated md:hidden" aria-label="Show chats">
            <ListIcon />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h1>
          <span className="hidden items-center gap-2 rounded-chip border border-line px-2 py-1 text-xs text-muted sm:inline-flex" title={assistant.detail}>
            <AssistantDot status={system?.assistant} />
            {assistant.title}
          </span>
          <Button size="sm" variant="ghost" className="md:hidden" onClick={startNew} aria-label="New chat" icon={<NotePencilIcon className="h-4 w-4" />} />
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
          <div className="mx-auto h-full w-full max-w-3xl px-4 sm:px-6">
            {sessionError ? (
              <div className="py-10"><ErrorState message={errorMessage(sessionError)} /></div>
            ) : loadingHistory ? (
              <div className="space-y-8 py-10">
                <Skeleton className="ml-auto h-10 w-1/2" />
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div>
              </div>
            ) : messages.length === 0 ? (
              <EmptyChat onPick={(text) => void send(text)} scopeText={scopeText} />
            ) : (
              <div className="space-y-8 py-8">
                {messages.map((message) => (
                  <MessageView key={message.id} message={message} streaming={message.id === STREAM_ID} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {error && <div className="mb-2"><ErrorState message={error} onRetry={() => void send(input)} /></div>}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void send(input)
              }}
              className="rounded-[16px] border border-line bg-surface shadow-panel transition-[border-color,box-shadow] focus-within:border-line-strong focus-within:ring-4 focus-within:ring-accent/[0.07]"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask a question about your documents"
                aria-label="Message"
                className="block max-h-[200px] w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-6 text-fg placeholder:text-subtle focus:outline-none"
              />
              <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setScopeOpen(true)}
                  className={cn(
                    'inline-flex h-8 max-w-[70%] items-center gap-1.5 rounded-[9px] px-2.5 text-[13px] transition-colors',
                    scoped ? 'bg-accent/10 text-accent-ink hover:bg-accent/15' : 'text-muted hover:bg-elevated hover:text-fg',
                  )}
                >
                  <FunnelSimpleIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{scopeText}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-subtle sm:inline"><Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for a new line</span>
                  {streaming ? (
                    <button type="button" onClick={() => abortRef.current?.abort()} className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-fg text-bg transition-transform active:scale-[0.94]" aria-label="Stop generating">
                      <StopIcon weight="fill" className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button type="submit" disabled={!input.trim()} className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent text-on-accent transition-[transform,opacity] active:scale-[0.94] disabled:opacity-30" aria-label="Send">
                      <ArrowUpIcon weight="bold" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </form>
            <p className="mt-2 text-center text-xs text-subtle">Answers can be wrong. Check the cited sources for anything important.</p>
          </div>
        </div>
      </section>

      <ScopePicker open={scopeOpen} onClose={() => setScopeOpen(false)} value={scope} onChange={setScope} />

      <Sheet open={sessionsOpen} onClose={() => setSessionsOpen(false)} title="Chats" className="max-w-sm">
        <div className="-mx-6 -my-5 h-[calc(100%+2.5rem)]">
          <SessionList {...sessionListProps} />
        </div>
      </Sheet>

      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename chat"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveRename}>Save</Button>
          </>
        }
      >
        <form onSubmit={saveRename}>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} aria-label="Chat title" data-autofocus maxLength={255} />
        </form>
      </Dialog>
      <span className="sr-only" aria-live="polite">{streaming ? 'Infera is answering' : ''}</span>
    </div>
  )
}
