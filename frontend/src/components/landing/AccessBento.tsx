import { useRef, type ReactNode } from 'react'
import { CheckIcon, FingerprintIcon, LockSimpleIcon, MinusIcon } from '@phosphor-icons/react'

import { cn } from '../../lib/format'
import { can, ROLES, type Capability } from '../../lib/rbac'
import { gsap, ScrollTrigger, useGSAP } from './gsap'

const MATRIX: { capability: Capability; label: string }[] = [
  { capability: 'createProjects', label: 'Create projects' },
  { capability: 'addPeople', label: 'Add people' },
  { capability: 'changeRoles', label: 'Change roles' },
  { capability: 'viewAuditLog', label: 'Read audit log' },
]

function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('bento-cell relative overflow-hidden rounded-panel border border-line bg-surface p-6', className)}>{children}</div>
}

function RoleCell({ role, lines, className }: { role: string; lines: string[]; className?: string }) {
  return (
    <Cell className={className}>
      <h3 className="text-lg font-semibold tracking-[-0.01em]">{role}</h3>
      <ul className="mt-3 space-y-1.5 text-[15px] leading-6 text-muted">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </Cell>
  )
}

export function AccessBento() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cells = gsap.utils.toArray<HTMLElement>('.bento-cell', root.current)
        gsap.set(cells, { autoAlpha: 0, y: 28 })
        ScrollTrigger.batch(cells, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }),
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} id="access" aria-labelledby="access-title" className="mx-auto max-w-[1200px] px-5 py-28 sm:px-8 md:py-36">
      <h2 id="access-title" className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.035em] md:text-5xl">Everyone sees only what their role allows</h2>
      <p className="mt-5 max-w-[56ch] text-[17px] leading-7 text-muted">Permissions are checked on every search, so an answer can never quote a file the reader could not open.</p>

      <div className="mt-14 grid gap-3 md:grid-cols-6">
        <Cell className="bg-[radial-gradient(120%_120%_at_0%_0%,rgb(var(--accent)/0.16),transparent_55%)] md:col-span-4">
          <h3 className="text-lg font-semibold tracking-[-0.01em]">Founder</h3>
          <p className="mt-3 max-w-md text-[15px] leading-6 text-muted">Sees every project and document in the company, manages roles, and can read the full audit trail of sign-ins, uploads and questions.</p>
        </Cell>

        <Cell className="md:col-span-2 md:row-span-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em]"><FingerprintIcon className="h-5 w-5 text-accent-ink" /> Who can do what</h3>
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-subtle">
                <th className="pb-2 font-medium"><span className="sr-only">Capability</span></th>
                {ROLES.map((r) => <th key={r} className="pb-2 text-center font-medium">{r === 'Employee' ? 'Staff' : r}</th>)}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.capability} className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-2 text-left font-normal text-muted">{row.label}</th>
                  {ROLES.map((r) => (
                    <td key={r} className="py-2.5 text-center">
                      {can(r, row.capability) ? <CheckIcon weight="bold" className="mx-auto h-4 w-4 text-accent-ink" aria-label="Yes" /> : <MinusIcon className="mx-auto h-4 w-4 text-line-strong" aria-label="No" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs leading-5 text-subtle">Inside a project, owners and editors can add files. Viewers can only read and ask.</p>
        </Cell>

        <RoleCell role="HR" className="md:col-span-2" lines={['Adds people and hands out accounts', 'Keeps the team directory current']} />
        <RoleCell role="PM" className="md:col-span-2" lines={['Creates projects', 'Chooses who can edit and who can only read']} />
        <RoleCell role="Employee" className="md:col-span-3" lines={['Works inside the projects they are invited to', 'Asks questions across all of them at once']} />

        <Cell className="bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(var(--line)/0.45)_10px_11px)] md:col-span-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em]"><LockSimpleIcon className="h-5 w-5" /> A private space for everyone</h3>
          <p className="mt-3 max-w-md text-[15px] leading-6 text-muted">Personal notes and drafts are searchable by their author and nobody else.</p>
        </Cell>
      </div>
    </section>
  )
}
