import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeftIcon, CheckIcon, FloppyDiskIcon, MagnifyingGlassIcon, NoteIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { FolderTree, flattenFolders } from '../components/app/FolderTree'
import { SpacePicker } from '../components/app/SpacePicker'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { confirm } from '../components/ui/Confirm'
import { EmptyState, ErrorState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { Kbd, Spinner } from '../components/ui/misc'
import { Dialog } from '../components/ui/Overlay'
import { Segmented } from '../components/ui/Segmented'
import { SkeletonRows } from '../components/ui/Skeleton'
import { keys, useFolderTree, useNotes, type Space } from '../hooks/queries'
import { useFolderActions } from '../hooks/useFolderActions'
import { useSpaceInfo, useSpaceParam } from '../hooks/useSpaces'
import { api, errorMessage } from '../lib/api'
import { cn, relativeTime } from '../lib/format'
import type { Note } from '../lib/types'

interface Draft {
  title: string
  content: string
  folder: number | null
}

const EMPTY: Draft = { title: '', content: '', folder: null }

export default function Notes() {
  const [space, setSpace] = useSpaceParam('personal')
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { projects, name: spaceName, canContribute } = useSpaceInfo(space)
  const notesQuery = useNotes(space)
  const { data: folders = [] } = useFolderTree(space === 'all' ? 'personal' : space)
  const folderActions = useFolderActions(space)

  const noteParam = params.get('note')
  const selectedId = noteParam && /^\d+$/.test(noteParam) ? Number(noteParam) : null
  const isNew = params.get('new') === '1'
  const [folder, setFolder] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const notes = notesQuery.data ?? []
  const selected = notes.find((n) => n.id === selectedId) ?? null
  const editing = isNew || selected !== null
  const readOnly = selected !== null && !selected.can_edit
  const original: Draft = selected ? { title: selected.title, content: selected.content, folder: selected.folder } : EMPTY
  const dirty = editing && (draft.title !== original.title || draft.content !== original.content || draft.folder !== original.folder)

  useEffect(() => {
    if (selected) setDraft({ title: selected.title, content: selected.content, folder: selected.folder })
    else if (isNew) setDraft({ ...EMPTY, folder })
    setMode('write')
    // Reset only when switching notes (or when a deep-linked note first loads), not on every refetch.
  }, [selectedId, isNew, selected?.id])

  useLayoutEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.max(node.scrollHeight, 320)}px`
  })

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return notes.filter(
      (n) => (space === 'all' || folder === null || n.folder === folder) && (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)),
    )
  }, [notes, folder, filter, space])

  const guard = async () => !dirty || confirm({ title: 'Discard unsaved changes?', description: 'Your edits to this note will be lost.', confirmLabel: 'Discard', danger: true })

  const open = async (id: number | 'new') => {
    if (!(await guard())) return
    const next = new URLSearchParams(params)
    next.delete('note')
    next.delete('new')
    if (id === 'new') next.set('new', '1')
    else next.set('note', String(id))
    setParams(next, { replace: true })
    if (id === 'new') requestAnimationFrame(() => document.getElementById('note-title')?.focus())
  }

  const close = async () => {
    if (!(await guard())) return
    const next = new URLSearchParams(params)
    next.delete('note')
    next.delete('new')
    setParams(next, { replace: true })
  }

  const changeSpace = async (next: Space) => {
    if (!(await guard())) return
    setFolder(null)
    setSpace(next)
  }

  const save = async () => {
    if (!draft.content.trim()) {
      toast.error('Write something before saving.')
      return
    }
    setSaving(true)
    const title = draft.title.trim() || draft.content.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 80)
    try {
      if (selected) {
        const { data } = await api.patch<Note>(`/notes/${selected.id}/`, { title, content: draft.content, folder: draft.folder })
        setDraft({ title: data.title, content: data.content, folder: data.folder })
      } else {
        const project = typeof space === 'number' ? space : null
        const { data } = await api.post<Note>('/notes/', { title, content: draft.content, folder: draft.folder, project })
        await queryClient.invalidateQueries({ queryKey: ['notes'] })
        const next = new URLSearchParams(params)
        next.delete('new')
        next.set('note', String(data.id))
        setParams(next, { replace: true })
      }
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['folders'] })
      void queryClient.invalidateQueries({ queryKey: keys.dashboard })
      toast.success('Note saved')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!selected) return
    const ok = await confirm({ title: `Delete "${selected.title}"?`, description: 'The note is removed from search right away.', confirmLabel: 'Delete note', danger: true })
    if (!ok) return
    try {
      await api.delete(`/notes/${selected.id}/`)
      const next = new URLSearchParams(params)
      next.delete('note')
      setParams(next, { replace: true })
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && editing && !readOnly) {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!dirty) return
    const onUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  const canCreate = space === 'all' || canContribute

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[232px_300px_1fr] lg:px-10 lg:pt-10">
      <aside className="space-y-6 lg:sticky lg:top-10 lg:self-start">
        <SpacePicker value={space} onChange={(s) => void changeSpace(s)} projects={projects} allowAll />
        {space !== 'all' && (
          <div className="hidden lg:block">
            <FolderTree
              folders={folders}
              selected={folder}
              onSelect={setFolder}
              rootLabel="All notes"
              countKey="notes_count"
              editable={canContribute}
              onCreate={folderActions.create}
              onRename={(f) => { folderActions.setRenaming(f); setRenameDraft(f.name) }}
              onDelete={(f) => void folderActions.remove(f)}
            />
          </div>
        )}
      </aside>

      <section className={cn('min-w-0', editing && 'hidden lg:block')}>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Notes</h1>
          {canCreate && <Button size="sm" variant="primary" icon={<PlusIcon className="h-4 w-4" />} onClick={() => void open('new')}>New</Button>}
        </div>
        <div className="mt-4">
          <Input leading={<MagnifyingGlassIcon className="h-4 w-4" />} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search notes" aria-label="Search notes" className="h-9" />
        </div>
        <div className="mt-3">
          {notesQuery.error ? (
            <ErrorState message={errorMessage(notesQuery.error)} onRetry={() => void notesQuery.refetch()} />
          ) : notesQuery.isLoading ? (
            <SkeletonRows rows={5} />
          ) : !visible.length ? (
            <EmptyState className="py-10" icon={<NoteIcon className="h-5 w-5" />} title={filter ? 'No matching notes' : 'No notes here yet'} description={filter ? undefined : 'Notes are searchable by Infera as soon as you save them.'} />
          ) : (
            <ul className="space-y-1">
              {visible.map((note) => (
                <li key={note.id}>
                  <button
                    onClick={() => void open(note.id)}
                    className={cn('w-full rounded-control px-3 py-2.5 text-left transition-colors', note.id === selectedId ? 'bg-elevated ring-1 ring-line' : 'hover:bg-elevated/60')}
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{note.title}</span>
                      <span className="shrink-0 text-xs text-subtle">{relativeTime(note.updated_at)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-muted">{note.content.replace(/[#*_`>]/g, '').slice(0, 160)}</span>
                    {space === 'all' && <span className="mt-1 block text-xs text-subtle">{note.project_name ?? 'Personal'}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={cn('min-w-0', !editing && 'hidden lg:block')}>
        <AnimatePresence mode="wait" initial={false}>
          {!editing ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[60vh] items-center justify-center rounded-panel border border-dashed border-line">
              <EmptyState
                icon={<NoteIcon className="h-6 w-6" />}
                title="Pick a note or start a new one"
                description="Meeting notes, decisions and how-tos. Markdown works."
                action={canCreate ? <Button variant="primary" icon={<PlusIcon className="h-4 w-4" />} onClick={() => void open('new')}>New note</Button> : undefined}
              />
            </motion.div>
          ) : (
            <motion.article
              key={selectedId ?? 'new'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="rounded-panel border border-line bg-surface shadow-panel"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
                <button onClick={() => void close()} className="-ml-1 flex h-8 w-8 items-center justify-center rounded-[8px] text-muted hover:bg-elevated lg:hidden" aria-label="Back to notes">
                  <ArrowLeftIcon />
                </button>
                <Segmented size="sm" value={mode} onChange={setMode} options={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]} />
                {!readOnly && folders.length > 0 && space !== 'all' && (
                  <div className="w-44">
                    <Select value={draft.folder ?? ''} onChange={(e) => setDraft({ ...draft, folder: e.target.value ? Number(e.target.value) : null })} className="h-8 text-[13px]" aria-label="Folder">
                      <option value="">No folder</option>
                      {flattenFolders(folders).map(({ node, depth }) => <option key={node.id} value={node.id}>{`${'  '.repeat(depth)}${node.name}`}</option>)}
                    </Select>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {readOnly ? (
                    <Badge>View only</Badge>
                  ) : dirty ? (
                    <span className="text-xs text-warning">Unsaved</span>
                  ) : selected?.status === 'pending' || selected?.status === 'processing' ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted"><Spinner className="h-3 w-3" /> Indexing</span>
                  ) : selected ? (
                    <span className="flex items-center gap-1 text-xs text-subtle"><CheckIcon className="h-3.5 w-3.5 text-success" /> Saved {relativeTime(selected.updated_at)}</span>
                  ) : null}
                  {selected?.can_edit && <Button size="icon-sm" variant="ghost" onClick={() => void remove()} aria-label="Delete note" icon={<TrashIcon className="h-4 w-4" />} />}
                  {!readOnly && (
                    <Button size="sm" variant="primary" loading={saving} disabled={!dirty && !!selected} onClick={() => void save()} icon={<FloppyDiskIcon className="h-4 w-4" />}>
                      Save <Kbd className="ml-1 hidden border-on-accent/20 bg-transparent text-on-accent/70 sm:inline-flex">Ctrl S</Kbd>
                    </Button>
                  )}
                </div>
              </div>
              <div className="px-5 py-5 sm:px-8 sm:py-7">
                <input
                  id="note-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  readOnly={readOnly}
                  placeholder="Untitled note"
                  aria-label="Title"
                  className="w-full bg-transparent text-2xl font-semibold tracking-[-0.02em] text-fg placeholder:text-subtle focus:outline-none"
                />
                {selected && (
                  <p className="mt-1.5 text-xs text-subtle">
                    By {selected.author.display_name} in {selected.project_name ?? 'Personal'}
                  </p>
                )}
                {mode === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    value={draft.content}
                    onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                    readOnly={readOnly}
                    placeholder={`Write in ${space === 'all' ? 'your personal space' : spaceName}. Markdown headings, lists and tables are supported.`}
                    aria-label="Note content"
                    rows={12}
                    className="mt-5 min-h-[320px] w-full resize-none overflow-hidden bg-transparent font-sans text-[15px] leading-7 text-fg placeholder:text-subtle focus:outline-none"
                  />
                ) : (
                  <div className="prose-chat mt-5 min-h-[320px]">
                    {draft.content.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content}</ReactMarkdown> : <p className="text-subtle">Nothing to preview yet.</p>}
                  </div>
                )}
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </section>

      <Dialog
        open={folderActions.renaming !== null}
        onClose={() => folderActions.setRenaming(null)}
        title="Rename folder"
        footer={
          <>
            <Button variant="ghost" onClick={() => folderActions.setRenaming(null)}>Cancel</Button>
            <Button variant="primary" disabled={!renameDraft.trim()} onClick={() => folderActions.renaming && void folderActions.rename(folderActions.renaming, renameDraft.trim())}>Save</Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); if (folderActions.renaming && renameDraft.trim()) void folderActions.rename(folderActions.renaming, renameDraft.trim()) }}>
          <Input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} aria-label="Folder name" data-autofocus maxLength={255} />
        </form>
      </Dialog>
    </div>
  )
}
