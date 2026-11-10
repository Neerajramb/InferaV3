import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRightIcon, BooksIcon, MagnifyingGlassIcon, NoteIcon, PlusIcon, SparkleIcon, StackIcon, TrashIcon, UserMinusIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Avatar } from '../components/ui/Avatar'
import { ProjectRoleBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { confirm } from '../components/ui/Confirm'
import { EmptyState, ErrorState } from '../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Page, PageHeader, stagger } from '../components/ui/misc'
import { Sheet } from '../components/ui/Overlay'
import { Skeleton } from '../components/ui/Skeleton'
import { keys, useProjects, useTeam } from '../hooks/queries'
import { api, errorMessage } from '../lib/api'
import { cn, formatDate } from '../lib/format'
import { can } from '../lib/rbac'
import type { Project, ProjectMember, ProjectRole } from '../lib/types'
import { useAuth } from '../store/auth'

const ROLE_ORDER: Record<ProjectRole, number> = { owner: 0, editor: 1, viewer: 2 }

/** Owner first, then editors, then viewers, alphabetical within each. */
function sortMembers(members: ProjectMember[]) {
  return [...members].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.user.display_name.localeCompare(b.user.display_name))
}

function MemberStack({ project }: { project: Project }) {
  const shown = sortMembers(project.members).slice(0, 4)
  const extra = project.members.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <span key={m.id} className={cn('rounded-[10px] ring-2 ring-surface', i > 0 && '-ml-2')}>
          <Avatar name={m.user.display_name} seed={m.user.username} size="sm" />
        </span>
      ))}
      {extra > 0 && <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-[9px] bg-elevated text-[11px] font-medium text-muted ring-2 ring-surface">+{extra}</span>}
    </div>
  )
}

function CreateProjectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const me = useAuth((s) => s.user)
  const { data: team = [] } = useTeam()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<number[]>([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const people = team.filter((u) => u.id !== me?.id && (!filter || u.display_name.toLowerCase().includes(filter.toLowerCase())))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError('Give the project a name.')
    setSaving(true)
    setError(null)
    try {
      await api.post('/projects/', { name: name.trim(), description: description.trim(), member_ids: members })
      await queryClient.invalidateQueries({ queryKey: keys.projects })
      toast.success(`Created ${name.trim()}`)
      setName('')
      setDescription('')
      setMembers([])
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New project"
      description="Members can search everything uploaded to the project. You can change this later."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={submit}>Create project</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Name" error={error}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Field operations" data-autofocus maxLength={255} />}</Field>
        <Field label="What is it for?" hint="Optional. Shown on the project card.">{(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />}</Field>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-muted">Members <span className="text-subtle">({members.length} selected, added as editors)</span></p>
          <Input leading={<MagnifyingGlassIcon className="h-4 w-4" />} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find people" aria-label="Find people" className="h-9" />
          <ul className="-mx-2 mt-2 max-h-[38vh] overflow-y-auto">
            {people.map((person) => {
              const checked = members.includes(person.id)
              return (
                <li key={person.id}>
                  <label className={cn('flex cursor-pointer items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-elevated', checked && 'bg-accent/[0.06]')}>
                    <input type="checkbox" checked={checked} onChange={() => setMembers((m) => (checked ? m.filter((x) => x !== person.id) : [...m, person.id]))} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                    <Avatar name={person.display_name} seed={person.username} size="sm" online={person.online} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{person.display_name}</span>
                      <span className="block text-xs text-subtle">{person.role}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </form>
    </Sheet>
  )
}

function ProjectSheet({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: team = [] } = useTeam()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [newMember, setNewMember] = useState('')
  const [newRole, setNewRole] = useState<ProjectRole>('editor')
  const [busy, setBusy] = useState(false)

  // Each project opens fresh, not in the previous project's edit form.
  useEffect(() => {
    setEditing(false)
    setNewMember('')
    setNewRole('editor')
  }, [project?.id])

  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.projects })
  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true)
    try {
      await action()
      await refresh()
      if (success) toast.success(success)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!project) return <Sheet open={false} onClose={onClose} title=""><span /></Sheet>
  const memberIds = new Set(project.members.map((m) => m.user.id))
  const candidates = team.filter((u) => !memberIds.has(u.id))

  return (
    <Sheet open onClose={onClose} title={project.name} description={`Created ${formatDate(project.created_at)} by ${project.owner.display_name}`}>
      <div className="space-y-8">
        {editing ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void run(() => api.patch(`/projects/${project.id}/`, form), 'Project updated').then(() => setEditing(false))
            }}
          >
            <Field label="Name">{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-autofocus maxLength={255} required />}</Field>
            <Field label="Description">{(p) => <Textarea {...p} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />}</Field>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" loading={busy}>Save</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-sm leading-6 text-muted">{project.description || 'No description yet.'}</p>
            {project.can_manage && (
              <button onClick={() => { setForm({ name: project.name, description: project.description }); setEditing(true) }} className="mt-2 text-[13px] font-medium text-accent-ink hover:underline">
                Edit details
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {[
            { to: `/documents?space=${project.id}`, icon: <BooksIcon className="h-4 w-4" />, label: 'Documents', value: project.document_count },
            { to: `/notes?space=${project.id}`, icon: <NoteIcon className="h-4 w-4" />, label: 'Notes', value: project.note_count },
            { to: `/chat?new=1&project=${project.id}`, icon: <SparkleIcon className="h-4 w-4 text-accent-ink" />, label: 'Ask Infera', value: null },
          ].map((link) => (
            <Link key={link.label} to={link.to} className="rounded-control border border-line bg-sunken/50 px-3 py-3 transition-[border-color,transform] hover:border-line-strong active:scale-[0.98]">
              <span className="flex items-center gap-1.5 text-[13px] text-muted">{link.icon} {link.label}</span>
              {link.value === null ? (
                <span className="mt-1 flex h-7 items-center text-sm font-medium text-fg">Start a chat <ArrowRightIcon className="ml-1 h-3.5 w-3.5" /></span>
              ) : (
                <span className="mt-1 block text-lg font-semibold tabular">{link.value}</span>
              )}
            </Link>
          ))}
        </div>

        <section>
          <h3 className="text-sm font-semibold">Members</h3>
          <ul className="mt-3 divide-y divide-line">
            {sortMembers(project.members).map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={member.user.display_name} seed={member.user.username} size="sm" online={member.user.online} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{member.user.display_name}</span>
                  <span className="block text-xs text-subtle">{member.user.role}</span>
                </span>
                {project.can_manage && member.role !== 'owner' ? (
                  <>
                    <div className="w-28">
                      <Select
                        value={member.role}
                        onChange={(e) => void run(() => api.patch(`/projects/${project.id}/members/${member.user.id}/`, { role: e.target.value }))}
                        className="h-8 text-[13px]"
                        aria-label={`Role for ${member.user.display_name}`}
                        disabled={busy}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </Select>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${member.user.display_name}`}
                      icon={<UserMinusIcon className="h-4 w-4" />}
                      onClick={async () => {
                        const ok = await confirm({ title: `Remove ${member.user.display_name}?`, description: `They will lose access to ${project.name} and its files.`, confirmLabel: 'Remove', danger: true })
                        if (ok) void run(() => api.delete(`/projects/${project.id}/members/${member.user.id}/`), 'Member removed')
                      }}
                    />
                  </>
                ) : (
                  <ProjectRoleBadge role={member.role} />
                )}
              </li>
            ))}
          </ul>

          {project.can_manage && candidates.length > 0 && (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (newMember) void run(() => api.post(`/projects/${project.id}/members/`, { user_id: Number(newMember), role: newRole }), 'Member added').then(() => setNewMember(''))
              }}
            >
              <div className="min-w-[180px] flex-1">
                <Select value={newMember} onChange={(e) => setNewMember(e.target.value)} aria-label="Person to add">
                  <option value="">Add a person</option>
                  {candidates.map((u) => <option key={u.id} value={u.id}>{u.display_name} ({u.role})</option>)}
                </Select>
              </div>
              <div className="w-28">
                <Select value={newRole} onChange={(e) => setNewRole(e.target.value as ProjectRole)} aria-label="Role">
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </div>
              <Button type="submit" disabled={!newMember} loading={busy}>Add</Button>
            </form>
          )}
        </section>

        {project.can_manage && (
          <section className="rounded-control border border-danger/25 p-4">
            <h3 className="text-sm font-semibold text-danger">Delete project</h3>
            <p className="mt-1 text-[13px] leading-5 text-muted">Removes the project with all of its documents, notes and folders for every member.</p>
            <Button
              variant="danger"
              size="sm"
              className="mt-3"
              icon={<TrashIcon className="h-4 w-4" />}
              onClick={async () => {
                const ok = await confirm({ title: `Delete ${project.name}?`, description: `${project.document_count} documents and ${project.note_count} notes will be deleted. This cannot be undone.`, confirmLabel: 'Delete project', danger: true })
                if (ok) void run(() => api.delete(`/projects/${project.id}/`), 'Project deleted').then(onClose)
              }}
            >
              Delete project
            </Button>
          </section>
        )}
      </div>
    </Sheet>
  )
}

export default function Projects() {
  const role = useAuth((s) => s.user?.role)
  const { data: projects = [], isLoading, error, refetch } = useProjects()
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const open = useMemo(() => projects.find((p) => p.id === openId) ?? null, [projects, openId])
  const canCreate = can(role, 'createProjects')

  return (
    <Page>
      <PageHeader
        title="Projects"
        description="Each project is a shared space. Members search its files together; everyone else cannot see them."
        actions={canCreate && <Button variant="primary" icon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>New project</Button>}
      />

      <div className="mt-8">
        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-panel" />)}</div>
        ) : !projects.length ? (
          <EmptyState
            className="rounded-panel border border-dashed border-line"
            icon={<StackIcon className="h-6 w-6" />}
            title="No projects yet"
            description={canCreate ? 'Create a project to share documents with a group of people.' : 'When someone adds you to a project it will appear here.'}
            action={canCreate ? <Button variant="primary" onClick={() => setCreating(true)}>Create the first project</Button> : undefined}
          />
        ) : (
          <motion.ul variants={stagger.container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <motion.li variants={stagger.item} key={project.id}>
                <button
                  onClick={() => setOpenId(project.id)}
                  className="group flex h-full w-full flex-col rounded-panel border border-line bg-surface p-5 text-left shadow-panel transition-[border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong active:scale-[0.99]"
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{project.name}</h2>
                    <ProjectRoleBadge role={project.my_role} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 min-h-[40px] text-sm leading-5 text-muted">{project.description || 'No description yet.'}</p>
                  <div className="mt-auto flex w-full items-center justify-between pt-5">
                    <MemberStack project={project} />
                    <span className="flex items-center gap-3 text-xs text-subtle tabular">
                      <span className="flex items-center gap-1"><BooksIcon className="h-3.5 w-3.5" /> {project.document_count}</span>
                      <span className="flex items-center gap-1"><NoteIcon className="h-3.5 w-3.5" /> {project.note_count}</span>
                    </span>
                  </div>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>

      <CreateProjectSheet open={creating} onClose={() => setCreating(false)} />
      <ProjectSheet project={open} onClose={() => setOpenId(null)} />
    </Page>
  )
}
