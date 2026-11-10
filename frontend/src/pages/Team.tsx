import { useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { CheckIcon, CopyIcon, DotsThreeIcon, MagnifyingGlassIcon, ProhibitIcon, UserCirclePlusIcon, UserPlusIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Avatar } from '../components/ui/Avatar'
import { Badge, RoleBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { confirm } from '../components/ui/Confirm'
import { EmptyState, ErrorState } from '../components/ui/EmptyState'
import { Field, Input, Select } from '../components/ui/Field'
import { Menu } from '../components/ui/Menu'
import { Page, PageHeader, stagger } from '../components/ui/misc'
import { Sheet } from '../components/ui/Overlay'
import { Segmented } from '../components/ui/Segmented'
import { SkeletonRows } from '../components/ui/Skeleton'
import { keys, useTeam } from '../hooks/queries'
import { api, errorMessage } from '../lib/api'
import { cn, formatDate, relativeTime } from '../lib/format'
import { copyText } from '../lib/clipboard'
import { can, ROLE_SUMMARY, ROLES } from '../lib/rbac'
import type { Role, User } from '../lib/types'
import { useAuth } from '../store/auth'

function generatePassword() {
  const words = ['amber', 'birch', 'cedar', 'delta', 'ember', 'fjord', 'glade', 'harbor', 'island', 'juniper', 'kestrel', 'lumen', 'meadow', 'north', 'orbit', 'pine']
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length]
  return `${pick()}-${pick()}-${pick()}-${crypto.getRandomValues(new Uint32Array(1))[0] % 90 + 10}`
}

function AddPersonSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const actorRole = useAuth((s) => s.user?.role)
  const empty = { username: '', first_name: '', last_name: '', email: '', role: 'Employee' as Role, password: '' }
  const [form, setForm] = useState(() => ({ ...empty, password: generatePassword() }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setForm({ ...empty, password: generatePassword() })
    setErrors({})
    setCreated(null)
    setCopied(false)
  }

  const close = () => {
    onClose()
    setTimeout(reset, 300)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!/^[\w.@+-]{2,150}$/.test(form.username)) next.username = 'Use letters, numbers and . @ + - _ only.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'That email address looks incomplete.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      await api.post('/team/', form)
      await queryClient.invalidateQueries({ queryKey: keys.team })
      setCreated({ username: form.username, password: form.password })
    } catch (error) {
      const data = (error as { response?: { data?: Record<string, string[]> } }).response?.data
      if (data && typeof data === 'object' && !('detail' in data)) {
        setErrors(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)])))
      } else toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const roles = ROLES.filter((r) => r !== 'Founder' || actorRole === 'Founder')

  return (
    <Sheet
      open={open}
      onClose={close}
      title={created ? 'Account created' : 'Add a person'}
      description={created ? 'Share these details privately. They can change the password in Settings.' : 'They will sign in with this username and a temporary password.'}
      footer={
        created ? (
          <>
            <Button variant="ghost" onClick={reset}>Add another</Button>
            <Button variant="primary" onClick={close}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={submit}>Create account</Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <dl className="space-y-3 rounded-control border border-line bg-sunken/60 p-4 font-mono text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Username</dt><dd>{created.username}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Password</dt><dd>{created.password}</dd></div>
          </dl>
          <Button
            icon={copied ? <CheckIcon className="h-4 w-4 text-success" /> : <CopyIcon className="h-4 w-4" />}
            onClick={async () => {
              if (await copyText(`Username: ${created.username}\nPassword: ${created.password}`)) setCopied(true)
              else toast.error("Couldn't copy. Select the details and copy them manually.")
            }}
          >
            {copied ? 'Copied' : 'Copy both'}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">{(p) => <Input {...p} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} data-autofocus />}</Field>
          <Field label="Last name">{(p) => <Input {...p} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />}</Field>
          <Field label="Username" error={errors.username} className="sm:col-span-2">{(p) => <Input {...p} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} autoComplete="off" spellCheck={false} />}</Field>
          <Field label="Email" error={errors.email} className="sm:col-span-2">{(p) => <Input {...p} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
          <Field label="Role" hint={ROLE_SUMMARY[form.role]} error={errors.role} className="sm:col-span-2">
            {(p) => (
              <Select {...p} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Temporary password" error={errors.password} className="sm:col-span-2">
            {(p) => (
              <div className="flex gap-2">
                <Input {...p} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono" autoComplete="new-password" />
                <Button onClick={() => setForm({ ...form, password: generatePassword() })}>Generate</Button>
              </div>
            )}
          </Field>
        </form>
      )}
    </Sheet>
  )
}

export default function Team() {
  const me = useAuth((s) => s.user)!
  const isFounder = can(me.role, 'changeRoles')
  const queryClient = useQueryClient()
  const [showInactive, setShowInactive] = useState(false)
  const { data: people = [], isLoading, error, refetch } = useTeam(showInactive)
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return people
      .filter(
        (p) => (roleFilter === 'all' || p.role === roleFilter) && (!q || p.display_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }))
  }, [people, roleFilter, search])

  const online = people.filter((p) => p.online && p.is_active).length

  const update = async (person: User, changes: Partial<Pick<User, 'role' | 'is_active'>>) => {
    try {
      await api.patch(`/team/${person.id}/`, changes)
      await queryClient.invalidateQueries({ queryKey: keys.team })
      toast.success(changes.role ? `${person.display_name} is now ${changes.role}` : changes.is_active ? `${person.display_name} can sign in again` : `${person.display_name} was deactivated`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <Page>
      <PageHeader
        title="People"
        description={`${people.filter((p) => p.is_active).length} people in the workspace, ${online} active in the last five minutes.`}
        actions={can(me.role, 'addPeople') && <Button variant="primary" icon={<UserPlusIcon className="h-4 w-4" />} onClick={() => setAdding(true)}>Add person</Button>}
      />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented value={roleFilter} onChange={setRoleFilter} size="sm" options={[{ value: 'all', label: 'Everyone' }, ...ROLES.map((r) => ({ value: r, label: r }))]} className="overflow-x-auto" />
        <div className="sm:ml-auto sm:w-60">
          <Input leading={<MagnifyingGlassIcon className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people" aria-label="Search people" className="h-9" />
        </div>
        {isFounder && (
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
            Show deactivated
          </label>
        )}
      </div>

      <div className="mt-4 rounded-panel border border-line bg-surface shadow-panel">
        {error ? (
          <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => void refetch()} /></div>
        ) : isLoading ? (
          <SkeletonRows rows={6} className="p-2" />
        ) : !filtered.length ? (
          <EmptyState icon={<UsersThreeIcon className="h-6 w-6" />} title="No one matches" description="Try another role or a shorter search." />
        ) : (
          <motion.ul variants={stagger.container} initial="hidden" animate="show" className="divide-y divide-line">
            {filtered.map((person) => (
              <motion.li variants={stagger.item} key={person.id} className={cn('flex items-center gap-4 px-4 py-3.5', !person.is_active && 'opacity-60')}>
                <Avatar name={person.display_name} seed={person.username} online={person.is_active ? person.online : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {person.display_name}
                    {person.id === me.id && <span className="text-xs font-normal text-subtle">(you)</span>}
                    {!person.is_active && <Badge tone="danger">Deactivated</Badge>}
                  </p>
                  <p className="truncate text-[13px] text-subtle">{person.email || `@${person.username}`}</p>
                </div>
                <p className="hidden w-36 text-[13px] text-muted md:block">{person.online ? 'Active now' : `Seen ${relativeTime(person.last_seen)}`}</p>
                <p className="hidden w-28 text-[13px] text-subtle lg:block">Joined {formatDate(person.date_joined)}</p>
                {isFounder && person.id !== me.id ? (
                  <div className="w-32">
                    <Select value={person.role} onChange={(e) => void update(person, { role: e.target.value as Role })} className="h-8 text-[13px]" aria-label={`Role for ${person.display_name}`}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  </div>
                ) : (
                  <div className="flex w-32 justify-end md:justify-start"><RoleBadge role={person.role} /></div>
                )}
                {isFounder && person.id !== me.id ? (
                  <Menu
                    items={[
                      person.is_active
                        ? {
                            label: 'Deactivate',
                            icon: <ProhibitIcon />,
                            danger: true,
                            onSelect: async () => {
                              const ok = await confirm({ title: `Deactivate ${person.display_name}?`, description: 'They will be signed out and unable to sign in. Their files stay in place.', confirmLabel: 'Deactivate', danger: true })
                              if (ok) void update(person, { is_active: false })
                            },
                          }
                        : { label: 'Reactivate', icon: <UserCirclePlusIcon />, onSelect: () => void update(person, { is_active: true }) },
                    ]}
                    trigger={(props) => (
                      <button {...props} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-subtle hover:bg-elevated hover:text-fg" aria-label={`Actions for ${person.display_name}`}>
                        <DotsThreeIcon weight="bold" className="h-4 w-4" />
                      </button>
                    )}
                  />
                ) : (
                  <span className="w-8" />
                )}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>

      <AddPersonSheet open={adding} onClose={() => setAdding(false)} />
    </Page>
  )
}
