import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretRightIcon, DotsThreeIcon, FolderIcon, FolderOpenIcon, FolderPlusIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'

import { cn } from '../../lib/format'
import type { FolderNode } from '../../lib/types'
import { Menu } from '../ui/Menu'

export function flattenFolders(nodes: FolderNode[], depth = 0): { node: FolderNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flattenFolders(node.children, depth + 1)])
}

export function folderPath(nodes: FolderNode[], id: number | null): FolderNode[] {
  if (id === null) return []
  for (const node of nodes) {
    if (node.id === id) return [node]
    const inner = folderPath(node.children, id)
    if (inner.length) return [node, ...inner]
  }
  return []
}

interface TreeProps {
  folders: FolderNode[]
  selected: number | null
  onSelect: (id: number | null) => void
  rootLabel: string
  editable: boolean
  countKey?: 'documents_count' | 'notes_count'
  onCreate?: (name: string, parent: number | null) => Promise<void>
  onRename?: (folder: FolderNode) => void
  onDelete?: (folder: FolderNode) => void
}

function InlineCreate({ onSubmit, onCancel, depth }: { onSubmit: (name: string) => Promise<void>; onCancel: () => void; depth: number }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return onCancel()
    setBusy(true)
    try {
      await onSubmit(name.trim())
      onCancel()
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 py-1 pr-2" style={{ paddingLeft: 10 + depth * 14 }}>
      <FolderIcon className="h-4 w-4 shrink-0 text-subtle" />
      <input
        autoFocus
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => !name.trim() && onCancel()}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        placeholder="Folder name"
        aria-label="New folder name"
        className="h-7 min-w-0 flex-1 rounded-[7px] border border-accent/50 bg-sunken px-2 text-sm text-fg focus:outline-none"
      />
    </form>
  )
}

function Branch({ node, depth, ...props }: TreeProps & { node: FolderNode; depth: number }) {
  const [open, setOpen] = useState(true)
  const [creating, setCreating] = useState(false)
  const active = props.selected === node.id
  const count = props.countKey ? node[props.countKey] : node.documents_count + node.notes_count

  return (
    <li>
      <div
        className={cn(
          'group relative flex h-8 items-center gap-1.5 rounded-[8px] pr-1 text-sm transition-colors',
          active ? 'bg-elevated text-fg' : 'text-muted hover:bg-elevated/60 hover:text-fg',
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn('flex h-6 w-5 shrink-0 items-center justify-center text-subtle', !node.children.length && 'invisible')}
          aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={open}
        >
          <CaretRightIcon className={cn('h-3 w-3 transition-transform duration-200 ease-out', open && 'rotate-90')} weight="bold" />
        </button>
        <button onClick={() => props.onSelect(node.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-current={active ? 'true' : undefined}>
          {active ? <FolderOpenIcon weight="fill" className="h-4 w-4 shrink-0 text-accent-ink" /> : <FolderIcon className="h-4 w-4 shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        <span className={cn('text-xs text-subtle tabular', props.editable && '[@media(hover:hover)]:group-hover:hidden')}>{count || ''}</span>
        {props.editable && (
          <Menu
            className="[@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:block [&:has([aria-expanded=true])]:block"
            items={[
              { label: 'New subfolder', icon: <FolderPlusIcon />, onSelect: () => { setOpen(true); setCreating(true) } },
              { label: 'Rename', icon: <PencilSimpleIcon />, onSelect: () => props.onRename?.(node) },
              { label: 'Delete', icon: <TrashIcon />, onSelect: () => props.onDelete?.(node), danger: true },
            ]}
            trigger={(t) => (
              <button {...t} className="flex h-6 w-6 items-center justify-center rounded-[6px] text-subtle hover:bg-sunken hover:text-fg" aria-label={`Options for ${node.name}`}>
                <DotsThreeIcon weight="bold" className="h-4 w-4" />
              </button>
            )}
          />
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (node.children.length > 0 || creating) && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <Branch key={child.id} {...props} node={child} depth={depth + 1} />
            ))}
            {creating && props.onCreate && (
              <InlineCreate depth={depth + 1} onCancel={() => setCreating(false)} onSubmit={(name) => props.onCreate!(name, node.id)} />
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

export function FolderTree(props: TreeProps) {
  const [creating, setCreating] = useState(false)
  const rootActive = props.selected === null
  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-xs font-medium text-subtle">Folders</p>
        {props.editable && props.onCreate && (
          <button onClick={() => setCreating(true)} className="flex h-6 w-6 items-center justify-center rounded-[6px] text-subtle hover:bg-elevated hover:text-fg" aria-label="New folder">
            <FolderPlusIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      <ul className="space-y-px">
        <li>
          <button
            onClick={() => props.onSelect(null)}
            className={cn('flex h-8 w-full items-center gap-2 rounded-[8px] px-2.5 text-sm transition-colors', rootActive ? 'bg-elevated text-fg' : 'text-muted hover:bg-elevated/60 hover:text-fg')}
          >
            <FolderOpenIcon weight={rootActive ? 'fill' : 'regular'} className={cn('h-4 w-4', rootActive && 'text-accent-ink')} />
            {props.rootLabel}
          </button>
        </li>
        {props.folders.map((node) => (
          <Branch key={node.id} {...props} node={node} depth={0} />
        ))}
        {creating && props.onCreate && <InlineCreate depth={0} onCancel={() => setCreating(false)} onSubmit={(name) => props.onCreate!(name, null)} />}
      </ul>
      {!props.folders.length && !creating && props.editable && (
        <p className="px-2.5 py-2 text-xs leading-5 text-subtle">No folders yet. Use the + button to group files.</p>
      )}
    </div>
  )
}
