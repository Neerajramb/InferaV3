import { useState, type FormEvent } from 'react'
import { MonitorIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { assistantLabel } from '../components/app/AssistantStatus'
import { Avatar } from '../components/ui/Avatar'
import { RoleBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { Page, PageHeader } from '../components/ui/misc'
import { Segmented } from '../components/ui/Segmented'
import { useSystemStatus } from '../hooks/queries'
import { api, errorMessage } from '../lib/api'
import { formatDate } from '../lib/format'
import type { Me } from '../lib/types'
import { useAuth } from '../store/auth'
import { useTheme, type ThemePreference } from '../store/theme'

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line py-8 md:grid-cols-[260px_1fr]">
      <div>
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
      <div className="max-w-xl">{children}</div>
    </section>
  )
}

export default function Settings() {
  const user = useAuth((s) => s.user)!
  const { preference, setPreference } = useTheme()
  const { data: system } = useSystemStatus()

  const [profile, setProfile] = useState({ first_name: user.first_name, last_name: user.last_name, email: user.email })
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const { data } = await api.patch<Me>('/auth/me/', profile)
      useAuth.getState().setUser(data)
      toast.success('Profile saved')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError(null)
    setSavingPassword(true)
    try {
      await api.post('/auth/password/', passwords)
      setPasswords({ current_password: '', new_password: '' })
      toast.success('Password changed')
    } catch (error) {
      setPasswordError(errorMessage(error))
    } finally {
      setSavingPassword(false)
    }
  }

  const assistant = assistantLabel(system?.assistant)

  return (
    <Page>
      <PageHeader title="Settings" description="Your profile, password and how Infera looks on this device." />

      <div className="mt-8 flex items-center gap-4">
        <Avatar name={user.display_name} seed={user.username} size="lg" />
        <div>
          <p className="text-lg font-semibold">{user.display_name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
            @{user.username} <RoleBadge role={user.role} />
            <span className="text-subtle">Joined {formatDate(user.date_joined)}</span>
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Section title="Profile" description="Your name is shown to teammates in messages and project member lists.">
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">{(p) => <Input {...p} value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} autoComplete="given-name" />}</Field>
            <Field label="Last name">{(p) => <Input {...p} value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} autoComplete="family-name" />}</Field>
            <Field label="Email" className="sm:col-span-2">{(p) => <Input {...p} type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} autoComplete="email" />}</Field>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" loading={savingProfile}>Save profile</Button>
            </div>
          </form>
        </Section>

        <Section title="Password" description="Use at least 8 characters. Avoid passwords you use elsewhere.">
          <form onSubmit={changePassword} className="grid gap-4">
            <Field label="Current password">{(p) => <Input {...p} type="password" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} autoComplete="current-password" required />}</Field>
            <Field label="New password" error={passwordError}>{(p) => <Input {...p} type="password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} autoComplete="new-password" required minLength={8} />}</Field>
            <div>
              <Button type="submit" loading={savingPassword}>Change password</Button>
            </div>
          </form>
        </Section>

        <Section title="Appearance" description="System follows your operating system setting.">
          <Segmented<ThemePreference>
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'system', label: <><MonitorIcon className="h-4 w-4" /> System</> },
              { value: 'light', label: <><SunIcon className="h-4 w-4" /> Light</> },
              { value: 'dark', label: <><MoonIcon className="h-4 w-4" /> Dark</> },
            ]}
          />
        </Section>

        <Section title="Assistant" description="Which model answers questions on this server. Configured by whoever runs the backend.">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Answers</dt><dd className="text-right font-medium">{assistant.title}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Embeddings</dt><dd className="text-right font-mono text-[13px]">{system?.embeddings.model ?? '...'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Indexed passages</dt><dd className="text-right tabular">{system?.index.chunks.toLocaleString() ?? '...'}</dd></div>
          </dl>
          {assistant.detail && <p className="mt-4 rounded-control border border-line bg-sunken/60 px-3.5 py-3 text-[13px] leading-5 text-muted">{assistant.detail}</p>}
        </Section>
      </div>
    </Page>
  )
}
