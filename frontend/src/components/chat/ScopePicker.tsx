import { useEffect, useMemo, useState } from 'react'
import { FileTextIcon, FolderIcon, MagnifyingGlassIcon, NoteIcon } from '@phosphor-icons/react'

import { useDocuments, useFolderTree, useNotes, useProjects } from '../../hooks/queries'
import { cn } from '../../lib/format'
import type { ChatScope, FolderNode } from '../../lib/types'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Sheet } from '../ui/Overlay'

export const EMPTY_SCOPE: ChatScope = { project_id: null, folder_ids: [], document_ids: [], note_ids: [] }

export function scopeLabel(scope: ChatScope, projectName?: string) {
  const picks = scope.document_ids.length + scope.note_ids.length
  const base = scope.project_id ? projectName ?? 'One project' : 'Everything you can access'
  if (picks) return `${picks} selected ${picks === 1 ? 'item' : 'items'}${scope.project_id ? ` in ${base}` : ''}`
  if (scope.folder_ids.length) return `${scope.folder_ids.length} ${scope.folder_ids.length === 1 ? 'folder' : 'folders'} in ${base}`
  return base
}

function flatten(nodes: FolderNode[], depth = 0): { node: FolderNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)])
}

function CheckRow({ checked, onChange, icon, label, meta, indent = 0 }: { checked: boolean; onChange: () => void; icon: React.ReactNode; label: string; meta?: string; indent?: number }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 text-sm transition-colors hover:bg-elevated', checked && 'bg-accent/[0.06]')} style={{ paddingLeft: 10 + indent * 18 }}>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 rounded-[4px] accent-[rgb(var(--accent))]" />
      <span className="shrink-0 text-subtle [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-fg">{label}</span>
      {meta && <span className="shrink-0 text-xs text-subtle">{meta}</span>}
    </label>
  )
}

interface ScopePickerProps {
  open: boolean
  onClose: () => void
  value: ChatScope
  onChange: (scope: ChatScope) => void
}

/** Narrow retrieval to a project, folders, or hand-picked documents and notes. */
export function ScopePicker({ open, onClose, value, onChange }: ScopePickerProps) {
  const [draft, setDraft] = useState<ChatScope>(value)
  const [filter, setFilter] = useState('')
  const space = draft.project_id ?? 'all'
  const { data: projects = [] } = useProjects()
  const { data: folders = [] } = useFolderTree(space)
  const { data: documents = [] } = useDocuments(space)
  const { data: notes = [] } = useNotes(space)

  useEffect(() => {
    if (open) {
      setDraft(value)
      setFilter('')
    }
  }, [open, value])

  const toggle = (key: 'folder_ids' | 'document_ids' | 'note_ids', id: number) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id] }))

  const q = filter.trim().toLowerCase()
  const flatFolders = useMemo(() => flatten(folders), [folders])
  const shownDocs = documents.filter((d) => d.status === 'ready' && (!q || d.title.toLowerCase().includes(q)))
  const shownNotes = notes.filter((n) => !q || n.title.toLowerCase().includes(q))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="What should Infera search?"
      description="Answers only use what you pick here. Leave everything unchecked to search all of it."
      footer={
        <>
          <Button variant="ghost" onClick={() => setDraft(EMPTY_SCOPE)}>Reset</Button>
          <Button variant="primary" onClick={() => { onChange(draft); onClose() }}>Apply</Button>
        </>
      }
    >
      <div className="space-y-6">
        <Field label="Project">
          {(p) => (
            <Select {...p} value={draft.project_id ?? ''} onChange={(e) => setDraft({ ...EMPTY_SCOPE, project_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">All projects and your personal files</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </Select>
          )}
        </Field>

        {flatFolders.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-muted">Folders</p>
            <div className="-mx-2.5">
              {flatFolders.map(({ node, depth }) => (
                <CheckRow key={node.id} indent={depth} checked={draft.folder_ids.includes(node.id)} onChange={() => toggle('folder_ids', node.id)} icon={<FolderIcon />} label={node.name} meta={`${node.documents_count + node.notes_count}`} />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-[13px] font-medium text-muted">Specific documents and notes</p>
          <Input leading={<MagnifyingGlassIcon className="h-4 w-4" />} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by title" aria-label="Filter documents and notes" />
          <div className="-mx-2.5 mt-2 max-h-[40vh] overflow-y-auto">
            {shownDocs.map((doc) => (
              <CheckRow key={`d${doc.id}`} checked={draft.document_ids.includes(doc.id)} onChange={() => toggle('document_ids', doc.id)} icon={<FileTextIcon />} label={doc.title} meta={doc.project_name ?? 'Personal'} />
            ))}
            {shownNotes.map((note) => (
              <CheckRow key={`n${note.id}`} checked={draft.note_ids.includes(note.id)} onChange={() => toggle('note_ids', note.id)} icon={<NoteIcon />} label={note.title} meta="Note" />
            ))}
            {!shownDocs.length && !shownNotes.length && <p className="px-2.5 py-6 text-center text-sm text-subtle">Nothing matches that filter.</p>}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
