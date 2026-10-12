import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowClockwiseIcon,
  ArrowSquareOutIcon,
  BooksIcon,
  CaretRightIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  FolderIcon,
  FolderSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  SparkleIcon,
  TrashIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

import { FolderTree, flattenFolders, folderPath } from '../components/app/FolderTree'
import { SpacePicker } from '../components/app/SpacePicker'
import { Avatar } from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { confirm } from '../components/ui/Confirm'
import { EmptyState, ErrorState } from '../components/ui/EmptyState'
import { Field, Input, Select } from '../components/ui/Field'
import { Menu } from '../components/ui/Menu'
import { Page, Spinner, stagger } from '../components/ui/misc'
import { Dialog } from '../components/ui/Overlay'
import { SkeletonRows } from '../components/ui/Skeleton'
import { keys, useDocuments, useFolderTree, useSystemStatus } from '../hooks/queries'
import { useFolderActions } from '../hooks/useFolderActions'
import { useSpaceInfo, useSpaceParam } from '../hooks/useSpaces'
import { api, errorMessage, openDocument } from '../lib/api'
import { cn, formatBytes, relativeTime } from '../lib/format'
import type { DocumentItem } from '../lib/types'

interface UploadJob {
  id: string
  name: string
  progress: number
  state: 'uploading' | 'done' | 'error'
  error?: string
}

const EXT_TONE: Record<string, string> = {
  pdf: 'text-danger',
  docx: 'text-[hsl(212_60%_62%)]',
  md: 'text-accent-ink',
  markdown: 'text-accent-ink',
  csv: 'text-success',
}

function FileGlyph({ ext }: { ext: string }) {
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-line bg-sunken font-mono text-[10px] font-medium uppercase', EXT_TONE[ext] ?? 'text-muted')}>
      {ext || 'doc'}
    </span>
  )
}

export default function Documents() {
  const [space, setSpace] = useSpaceParam('personal')
  const [params, setParams] = useSearchParams()
  const folderParam = params.get('folder')
  const folder = folderParam && /^\d+$/.test(folderParam) ? Number(folderParam) : null
  const { project, projects, name: spaceName, canContribute } = useSpaceInfo(space)
  const queryClient = useQueryClient()

  const { data: folders = [] } = useFolderTree(space === 'all' ? 'personal' : space)
  const docsQuery = useDocuments(space, space === 'all' ? undefined : folder ?? 'root')
  const { data: system } = useSystemStatus()
  const [filter, setFilter] = useState('')
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [dragging, setDragging] = useState(false)
  const [renamingDoc, setRenamingDoc] = useState<DocumentItem | null>(null)
  const [movingDoc, setMovingDoc] = useState<DocumentItem | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [folderDraft, setFolderDraft] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadButton = useRef<HTMLButtonElement>(null)
  const dragDepth = useRef(0)

  const setFolder = (id: number | null) => {
    const next = new URLSearchParams(params)
    if (id === null) next.delete('folder')
    else next.set('folder', String(id))
    setParams(next, { replace: true })
  }

  const folderActions = useFolderActions(space, (id) => id === folder && setFolder(null))
  const path = folderPath(folders, folder)
  const currentFolder = path[path.length - 1]
  const subfolders = space === 'all' ? [] : currentFolder ? currentFolder.children : folders
  const canUpload = space !== 'all' && canContribute

  useEffect(() => {
    if (params.get('upload') === '1') {
      uploadButton.current?.focus()
      const next = new URLSearchParams(params)
      next.delete('upload')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  const documents = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return (docsQuery.data ?? []).filter((d) => !q || d.title.toLowerCase().includes(q))
  }, [docsQuery.data, filter])

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['documents'] })
    void queryClient.invalidateQueries({ queryKey: ['folders'] })
    void queryClient.invalidateQueries({ queryKey: keys.dashboard })
  }

  const upload = async (files: File[]) => {
    if (!canUpload) {
      toast.error(space === 'all' ? 'Pick a space before uploading.' : 'You have view-only access to this project.')
      return
    }
    const maxMb = system?.upload.max_mb ?? 25
    for (const file of files) {
      const id = `${file.name}-${Date.now()}-${Math.random()}`
      if (file.size > maxMb * 1024 * 1024) {
        setJobs((j) => [...j, { id, name: file.name, progress: 0, state: 'error', error: `Larger than ${maxMb} MB` }])
        continue
      }
      setJobs((j) => [...j, { id, name: file.name, progress: 0, state: 'uploading' }])
      const form = new FormData()
      form.append('file', file)
      if (typeof space === 'number') form.append('project', String(space))
      if (folder !== null) form.append('folder', String(folder))
      try {
        await api.post('/documents/upload/', form, {
          onUploadProgress: (e) => setJobs((j) => j.map((job) => (job.id === id ? { ...job, progress: e.total ? e.loaded / e.total : 0 } : job))),
        })
        setJobs((j) => j.map((job) => (job.id === id ? { ...job, progress: 1, state: 'done' } : job)))
        setTimeout(() => setJobs((j) => j.filter((job) => job.id !== id)), 2500)
        refresh()
      } catch (error) {
        setJobs((j) => j.map((job) => (job.id === id ? { ...job, state: 'error', error: errorMessage(error) } : job)))
      }
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length) void upload(files)
  }

  const remove = async (doc: DocumentItem) => {
    const ok = await confirm({ title: `Delete ${doc.title}?`, description: 'The file and its search index are removed for everyone. This cannot be undone.', confirmLabel: 'Delete file', danger: true })
    if (!ok) return
    try {
      await api.delete(`/documents/${doc.id}/`)
      toast.success(`Deleted ${doc.title}`)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const reindex = async (doc: DocumentItem) => {
    try {
      await api.post(`/documents/${doc.id}/reindex/`)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const saveRename = async (event: FormEvent) => {
    event.preventDefault()
    if (!renamingDoc || !nameDraft.trim()) return
    try {
      await api.patch(`/documents/${renamingDoc.id}/`, { title: nameDraft.trim() })
      setRenamingDoc(null)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const saveMove = async () => {
    if (!movingDoc) return
    try {
      await api.patch(`/documents/${movingDoc.id}/`, { folder: folderDraft ? Number(folderDraft) : null })
      setMovingDoc(null)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const askHref = typeof space === 'number' ? `/chat?new=1&project=${space}` : '/chat?new=1'
  const hasContent = subfolders.length > 0 || documents.length > 0

  return (
    <Page wide>
      <div className="grid gap-8 lg:grid-cols-[232px_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-10 lg:self-start">
          <SpacePicker value={space} onChange={setSpace} projects={projects} allowAll />
          {space !== 'all' && (
            <div className="hidden lg:block">
              <FolderTree
                folders={folders}
                selected={folder}
                onSelect={setFolder}
                rootLabel="All files"
                countKey="documents_count"
                editable={canContribute}
                onCreate={folderActions.create}
                onRename={(f) => {
                  folderActions.setRenaming(f)
                  setNameDraft(f.name)
                }}
                onDelete={(f) => void folderActions.remove(f)}
              />
            </div>
          )}
        </aside>

        <section
          className="relative min-w-0"
          onDragEnter={(e) => {
            if (!canUpload || !e.dataTransfer.types.includes('Files')) return
            dragDepth.current += 1
            setDragging(true)
          }}
          onDragLeave={() => {
            dragDepth.current -= 1
            if (dragDepth.current <= 0) setDragging(false)
          }}
          onDragOver={(e) => canUpload && e.preventDefault()}
          onDrop={onDrop}
        >
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-subtle">
            <button onClick={() => setFolder(null)} className="hover:text-fg">{spaceName}</button>
            {path.map((node) => (
              <span key={node.id} className="flex items-center gap-1">
                <CaretRightIcon className="h-3 w-3" />
                <button onClick={() => setFolder(node.id)} className="hover:text-fg">{node.name}</button>
              </span>
            ))}
          </nav>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[28px]">{currentFolder?.name ?? (space === 'all' ? 'All documents' : 'Documents')}</h1>
              <p className="mt-1 text-sm text-muted">
                {space === 'all'
                  ? 'Every file you can open, across projects and your personal space.'
                  : project
                    ? `Shared with ${project.members.length} ${project.members.length === 1 ? 'person' : 'people'} in ${project.name}.`
                    : 'Private to you. Upload here for notes and drafts only you should search.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-56">
                <Input leading={<MagnifyingGlassIcon className="h-4 w-4" />} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name" aria-label="Filter documents" className="h-9" />
              </div>
              <Link to={askHref} className="inline-flex h-9 items-center gap-2 rounded-control border border-line bg-elevated px-3.5 text-sm font-medium transition-[transform,border-color] hover:border-line-strong active:scale-[0.97]">
                <SparkleIcon className="h-4 w-4 text-accent-ink" /> Ask
              </Link>
              {canUpload && (
                <Button ref={uploadButton} variant="primary" icon={<UploadSimpleIcon className="h-4 w-4" />} onClick={() => fileInput.current?.click()}>
                  Upload
                </Button>
              )}
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                accept={system?.upload.extensions.join(',') ?? '.pdf,.docx,.txt,.md,.csv'}
                onChange={(e) => {
                  void upload(Array.from(e.target.files ?? []))
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          {space !== 'all' && folders.length > 0 && (
            <div className="mt-4 lg:hidden">
              <Select value={folder ?? ''} onChange={(e) => setFolder(e.target.value ? Number(e.target.value) : null)} aria-label="Folder">
                <option value="">All files</option>
                {flattenFolders(folders).map(({ node, depth }) => <option key={node.id} value={node.id}>{`${'  '.repeat(depth)}${node.name}`}</option>)}
              </Select>
            </div>
          )}

          <AnimatePresence>
            {jobs.length > 0 && (
              <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 space-y-2" aria-live="polite">
                {jobs.map((job) => (
                  <li key={job.id} className="flex items-center gap-3 rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm">
                    {job.state === 'done' ? <CheckCircleIcon weight="fill" className="h-4 w-4 text-success" /> : job.state === 'error' ? <WarningCircleIcon weight="fill" className="h-4 w-4 text-danger" /> : <Spinner className="h-4 w-4 text-muted" />}
                    <span className="min-w-0 flex-1 truncate">{job.name}</span>
                    {job.state === 'uploading' && (
                      <span className="h-1 w-28 overflow-hidden rounded-full bg-sunken">
                        <span className="block h-full origin-left rounded-full bg-accent transition-transform duration-200" style={{ transform: `scaleX(${job.progress})` }} />
                      </span>
                    )}
                    {job.state === 'done' && <span className="text-xs text-muted">Uploaded, indexing</span>}
                    {job.state === 'error' && (
                      <>
                        <span className="text-xs text-danger">{job.error}</span>
                        <button onClick={() => setJobs((j) => j.filter((x) => x.id !== job.id))} className="text-subtle hover:text-fg" aria-label="Dismiss"><XIcon className="h-4 w-4" /></button>
                      </>
                    )}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          <div className="mt-6 rounded-panel border border-line bg-surface shadow-panel">
            {docsQuery.error ? (
              <div className="p-4"><ErrorState message={errorMessage(docsQuery.error)} onRetry={() => void docsQuery.refetch()} /></div>
            ) : docsQuery.isLoading ? (
              <SkeletonRows rows={6} className="p-2" />
            ) : !hasContent ? (
              <EmptyState
                icon={<BooksIcon className="h-6 w-6" />}
                title={filter ? 'Nothing matches that filter' : canUpload ? 'Drop files here to get started' : 'No documents yet'}
                description={
                  filter
                    ? 'Try a shorter search, or clear the filter.'
                    : canUpload
                      ? `PDF, Word, Markdown, CSV or text, up to ${system?.upload.max_mb ?? 25} MB each. Infera indexes them within seconds.`
                      : space === 'all'
                        ? 'Pick a space on the left to upload files.'
                        : 'You can read this project, but only owners and editors can upload.'
                }
                action={canUpload && !filter ? <Button variant="primary" icon={<UploadSimpleIcon className="h-4 w-4" />} onClick={() => fileInput.current?.click()}>Choose files</Button> : undefined}
              />
            ) : (
              <motion.ul variants={stagger.container} initial="hidden" animate="show" className="divide-y divide-line">
                {subfolders.map((sub) => (
                  <motion.li variants={stagger.item} key={`f${sub.id}`}>
                    <button onClick={() => setFolder(sub.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated/50">
                      <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-line bg-sunken text-muted"><FolderSimpleIcon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{sub.name}</span>
                      <span className="text-xs text-subtle">{sub.documents_count} {sub.documents_count === 1 ? 'file' : 'files'}</span>
                      <CaretRightIcon className="h-4 w-4 text-subtle" />
                    </button>
                  </motion.li>
                ))}
                {documents.map((doc) => (
                  <motion.li variants={stagger.item} key={doc.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated/50">
                    <FileGlyph ext={doc.extension} />
                    <button onClick={() => openDocument(doc.id, doc.title).catch((e) => toast.error(errorMessage(e)))} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-medium group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">{doc.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-subtle">
                        {formatBytes(doc.file_size)}
                        {doc.status === 'ready' ? `, ${doc.chunk_count} passages` : ''}
                        {space === 'all' ? `, ${doc.project_name ?? 'Personal'}` : ''}
                      </span>
                      {doc.status === 'failed' && doc.error && <span className="mt-1 block text-xs text-danger">{doc.error}</span>}
                    </button>
                    <span className="hidden items-center gap-2 text-xs text-subtle md:flex">
                      <Avatar name={doc.uploaded_by.display_name} seed={doc.uploaded_by.username} size="xs" />
                      {relativeTime(doc.created_at)}
                    </span>
                    <StatusBadge status={doc.status} error={doc.error} />
                    <Menu
                      items={[
                        { label: 'Open', icon: <ArrowSquareOutIcon />, onSelect: () => openDocument(doc.id, doc.title).catch((e) => toast.error(errorMessage(e))) },
                        { label: 'Download', icon: <DownloadSimpleIcon />, onSelect: () => openDocument(doc.id, doc.title, true).catch((e) => toast.error(errorMessage(e))) },
                        ...(doc.can_delete
                          ? [
                              { label: 'Rename', icon: <PencilSimpleIcon />, onSelect: () => { setRenamingDoc(doc); setNameDraft(doc.title) } },
                              ...(space !== 'all' ? [{ label: 'Move to folder', icon: <FolderIcon />, onSelect: () => { setMovingDoc(doc); setFolderDraft(doc.folder ? String(doc.folder) : '') } }] : []),
                              { label: 'Reindex', icon: <ArrowClockwiseIcon />, onSelect: () => void reindex(doc) },
                              'divider' as const,
                              { label: 'Delete', icon: <TrashIcon />, onSelect: () => void remove(doc), danger: true },
                            ]
                          : []),
                      ]}
                      trigger={(props) => (
                        <button {...props} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-subtle transition-colors hover:bg-sunken hover:text-fg" aria-label={`Actions for ${doc.title}`}>
                          <DotsThreeIcon weight="bold" className="h-4 w-4" />
                        </button>
                      )}
                    />
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>

          <AnimatePresence>
            {dragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none absolute inset-0 z-overlay flex items-center justify-center rounded-panel border-2 border-dashed border-accent/60 bg-bg/80 backdrop-blur-sm"
              >
                <div className="text-center">
                  <UploadSimpleIcon className="mx-auto h-8 w-8 text-accent-ink" />
                  <p className="mt-3 text-sm font-medium">Drop to upload to {currentFolder?.name ?? spaceName}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <Dialog
        open={renamingDoc !== null || folderActions.renaming !== null}
        onClose={() => { setRenamingDoc(null); folderActions.setRenaming(null) }}
        title={renamingDoc ? 'Rename document' : 'Rename folder'}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRenamingDoc(null); folderActions.setRenaming(null) }}>Cancel</Button>
            <Button variant="primary" onClick={(e) => (renamingDoc ? void saveRename(e) : folderActions.renaming && void folderActions.rename(folderActions.renaming, nameDraft.trim()))}>Save</Button>
          </>
        }
      >
        <form onSubmit={(e) => (renamingDoc ? void saveRename(e) : (e.preventDefault(), folderActions.renaming && void folderActions.rename(folderActions.renaming, nameDraft.trim())))}>
          <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} aria-label="Name" data-autofocus maxLength={255} />
        </form>
      </Dialog>

      <Dialog
        open={movingDoc !== null}
        onClose={() => setMovingDoc(null)}
        title="Move to folder"
        description={movingDoc?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMovingDoc(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void saveMove()}>Move</Button>
          </>
        }
      >
        <Field label="Folder">
          {(p) => (
            <Select {...p} value={folderDraft} onChange={(e) => setFolderDraft(e.target.value)}>
              <option value="">Top level of {spaceName}</option>
              {flattenFolders(folders).map(({ node, depth }) => <option key={node.id} value={node.id}>{`${'  '.repeat(depth)}${node.name}`}</option>)}
            </Select>
          )}
        </Field>
      </Dialog>
    </Page>
  )
}
