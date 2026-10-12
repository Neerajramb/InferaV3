import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowRightIcon, FileTextIcon, MagnifyingGlassIcon, NoteIcon, PlusIcon, SparkleIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { useSearch } from '../../hooks/queries'
import { errorMessage, openDocument } from '../../lib/api'
import { cn } from '../../lib/format'
import { can } from '../../lib/rbac'
import { useAuth } from '../../store/auth'
import { Kbd, Spinner } from '../ui/misc'
import { NAV_GROUPS } from './nav'

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  icon: ReactNode
  run: () => void
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/**
 * Opened from the keyboard many times a day, so it appears instantly with no animation.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const role = useAuth((s) => s.user?.role)
  const debounced = useDebounced(query, 250)
  const search = useSearch(open ? debounced : '')

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      onClose()
      navigate(to)
    }
    const q = query.trim().toLowerCase()
    const pages: Item[] = NAV_GROUPS.flatMap((g) => g.items)
      .filter((item) => !item.capability || can(role, item.capability))
      .map((item) => ({ id: item.to, group: 'Go to', label: item.label, icon: <item.icon />, run: go(item.to) }))
    const actions: Item[] = [
      { id: 'new-chat', group: 'Actions', label: 'Start a new chat', icon: <SparkleIcon />, run: go('/chat?new=1') },
      { id: 'upload', group: 'Actions', label: 'Upload a document', icon: <UploadSimpleIcon />, run: go('/documents?upload=1') },
      { id: 'note', group: 'Actions', label: 'Write a note', icon: <PlusIcon />, run: go('/notes?new=1') },
    ]
    const ask: Item[] = q
      ? [{ id: 'ask', group: 'Ask', label: `Ask Infera: "${query.trim()}"`, icon: <SparkleIcon weight="fill" className="text-accent-ink" />, run: go(`/chat?new=1&q=${encodeURIComponent(query.trim())}`) }]
      : []
    const matches = [...pages, ...actions].filter((item) => !q || item.label.toLowerCase().includes(q))
    const results: Item[] = (q.length >= 2 ? search.data ?? [] : []).map((hit) => ({
      id: `${hit.entity_type}-${hit.entity_id}-${hit.chunk_index}`,
      group: 'In your documents',
      label: hit.title,
      hint: hit.snippet?.slice(0, 90),
      icon: hit.entity_type === 'note' ? <NoteIcon /> : <FileTextIcon />,
      run: () => {
        onClose()
        if (hit.entity_type === 'note') navigate(`/notes?note=${hit.entity_id}`)
        else openDocument(hit.entity_id, hit.title).catch((e) => toast.error(errorMessage(e)))
      },
    }))
    const unique = results.filter((item, i, all) => all.findIndex((x) => x.label === item.label) === i)
    return [...ask, ...matches, ...unique]
  }, [query, role, search.data, navigate, onClose])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      items[active]?.run()
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = ''
  return createPortal(
    <div className="fixed inset-0 z-modal flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-[rgb(var(--shadow)/0.5)]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Search and commands" className="relative w-full max-w-xl overflow-hidden rounded-panel border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <MagnifyingGlassIcon className="h-[18px] w-[18px] text-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, pages and actions"
            className="h-14 flex-1 bg-transparent text-[15px] text-fg placeholder:text-subtle focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
          />
          {search.isFetching && <Spinner className="h-4 w-4 text-subtle" />}
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
          {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-subtle">No matches. Press Enter to ask Infera instead.</p>}
          {items.map((item, index) => {
            const header = item.group !== lastGroup
            lastGroup = item.group
            return (
              <div key={item.id}>
                {header && <p className="px-2.5 pb-1 pt-2.5 text-xs font-medium text-subtle">{item.group}</p>}
                <button
                  id={`palette-${item.id}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={item.run}
                  className={cn('flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-sm', index === active ? 'bg-elevated text-fg' : 'text-muted')}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-line bg-sunken [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    {item.hint && <span className="block truncate text-xs text-subtle">{item.hint}</span>}
                  </span>
                  {index === active && <ArrowRightIcon className="h-4 w-4 text-subtle" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
