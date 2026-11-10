import { useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react'

import { Logo } from '../components/app/Logo'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { API_URL, errorMessage } from '../lib/api'
import { useAuth } from '../store/auth'

// Demo sign-in is shown in development, or in a hosted demo built with VITE_DEMO_ACCOUNTS=true.
const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO_ACCOUNTS === 'true'
const DEMO_PASSWORD = (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? 'infera-demo-2026'
const DEMO_ACCOUNTS = [
  { username: 'ananya', name: 'Ananya', role: 'Founder' },
  { username: 'tomas', name: 'Tomás', role: 'HR' },
  { username: 'wei', name: 'Wei', role: 'PM' },
  { username: 'ifeoma', name: 'Ifeoma', role: 'Employee' },
]

/** A field of indexed passages. A handful light up, like a query finding its matches. */
function PassageField() {
  const reduce = useReducedMotion()
  const cells = useMemo(
    () =>
      Array.from({ length: 168 }, (_, i) => ({
        delay: ((i * 37) % 97) / 10,
        width: 35 + ((i * 53) % 60),
      })),
    [],
  )
  return (
    <div className="grid grid-cols-12 gap-x-2 gap-y-3" aria-hidden="true">
      {cells.map((cell, i) => (
        <motion.span
          key={i}
          className="h-1.5 rounded-full bg-fg/[0.07]"
          style={{ width: `${cell.width}%` }}
          animate={reduce ? undefined : { backgroundColor: ['rgb(var(--fg) / 0.07)', 'rgb(var(--accent) / 0.85)', 'rgb(var(--fg) / 0.07)'] }}
          transition={reduce ? undefined : { duration: 2.6, delay: cell.delay, repeat: Infinity, repeatDelay: 7 + (i % 5), ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const access = useAuth((s) => s.access)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  if (access) return <Navigate to={from} replace />

  const signIn = async (name: string, secret: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post(`${API_URL}/token/`, { username: name.trim(), password: secret })
      useAuth.getState().setSession(data)
      navigate(from, { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) setError('That username and password combination is not right.')
      else if (axios.isAxiosError(err) && err.response?.status === 429) setError('Too many attempts. Wait a minute and try again.')
      else setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    void signIn(username, password)
  }

  return (
    <div className="grid min-h-[100dvh] bg-bg lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_10%,rgb(var(--accent)/0.08),transparent_70%)]" />
        <Link to="/" className="relative w-fit">
          <Logo />
        </Link>
        <div className="relative">
          <PassageField />
          <h1 className="mt-14 max-w-md text-[34px] font-semibold leading-[1.1] tracking-[-0.03em]">Every answer points back to the page it came from.</h1>
          <p className="mt-4 max-w-sm text-[15px] leading-7 text-muted">Ask in plain language. Infera searches only what your role can open and cites each source.</p>
        </div>
        <p className="relative text-xs text-subtle">Runs on your own server. Files stay where you upload them.</p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
            <ArrowLeftIcon className="h-4 w-4" /> Home
          </Link>
          <span className="lg:hidden"><Logo /></span>
        </div>

        <motion.div
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">Sign in to your workspace</h2>
          <p className="mt-2 text-sm text-muted">Accounts are created by your Founder or HR team.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Field label="Username">
              {(p) => <Input {...p} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus spellCheck={false} />}
            </Field>
            <Field label="Password" error={error}>
              {(p) => (
                <div className="relative">
                  <Input {...p} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="pr-11" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-subtle hover:text-fg"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </Field>
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full" iconRight={<ArrowRightIcon className="h-4 w-4" />}>
              Sign in
            </Button>
          </form>

          {SHOW_DEMO && (
            <section className="mt-10 border-t border-line pt-6" aria-labelledby="demo-heading">
              <h3 id="demo-heading" className="text-[13px] font-medium text-fg">Try a demo account</h3>
              <p className="mt-1 text-[13px] leading-5 text-muted">Each role sees a different slice of the workspace.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.username}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setUsername(account.username)
                      setPassword(DEMO_PASSWORD)
                      void signIn(account.username, DEMO_PASSWORD)
                    }}
                    className="flex flex-col items-start rounded-control border border-line bg-surface px-3 py-2.5 text-left transition-[border-color,transform] hover:border-line-strong active:scale-[0.98] disabled:opacity-60"
                  >
                    <span className="text-sm font-medium text-fg">{account.name}</span>
                    <span className="text-xs text-subtle">{account.role}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </main>
    </div>
  )
}
