import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import {
  GearSixIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MonitorIcon,
  MoonIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SunIcon,
  XIcon,
} from '@phosphor-icons/react'

import { useSystemStatus, useUnread } from '../../hooks/queries'
import { api } from '../../lib/api'
import { cn } from '../../lib/format'
import { can } from '../../lib/rbac'
import { useAuth } from '../../store/auth'
import { useTheme, type ThemePreference } from '../../store/theme'
import { Avatar } from '../ui/Avatar'
import { Kbd } from '../ui/misc'
import { Menu } from '../ui/Menu'
import { Tooltip } from '../ui/Tooltip'
import { AssistantDot, assistantLabel } from './AssistantStatus'
import { CommandPalette } from './CommandPalette'
import { LogoMark } from './Logo'
import { NAV_GROUPS } from './nav'

const COLLAPSE_KEY = 'infera-sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export function useSignOut() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return async () => {
    const refresh = useAuth.getState().refresh
    if (refresh) await api.post('/token/blacklist/', { refresh }).catch(() => undefined)
    useAuth.getState().clear()
    queryClient.clear()
    navigate('/login', { replace: true })
  }
}

interface SidebarProps {
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
  onOpenPalette: () => void
  mobile?: boolean
}

function Sidebar({ collapsed, onToggle, onNavigate, onOpenPalette, mobile }: SidebarProps) {
  const user = useAuth((s) => s.user)
  const { data: unread } = useUnread()
  const { data: system } = useSystemStatus()
  const { preference, setPreference } = useTheme()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const assistant = assistantLabel(system?.assistant)

  const themeIcon = { system: <MonitorIcon />, light: <SunIcon />, dark: <MoonIcon /> }
  const nextTheme: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-14 items-center', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
        <NavLink to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 rounded-control" aria-label="Infera home">
          <LogoMark />
          {!collapsed && <span className="text-[15px] font-semibold tracking-[-0.01em]">Infera</span>}
        </NavLink>
        {!collapsed && onToggle && (
          <Tooltip label="Collapse sidebar" side="bottom">
            <button onClick={onToggle} className="flex h-8 w-8 items-center justify-center rounded-control text-subtle transition-colors hover:bg-elevated hover:text-fg" aria-label="Collapse sidebar" aria-expanded="true">
              <SidebarSimpleIcon />
            </button>
          </Tooltip>
        )}
      </div>

      <div className={cn('pb-2', collapsed ? 'px-2' : 'px-3')}>
        <Tooltip label="Search" side="right" disabled={!collapsed}>
          <button
            onClick={onOpenPalette}
            className={cn(
              'flex h-9 items-center gap-2 rounded-control border border-line bg-sunken/60 text-[13px] text-subtle transition-colors hover:border-line-strong hover:text-muted',
              collapsed ? 'w-11 justify-center' : 'w-full px-2.5',
            )}
            aria-label="Search or jump to"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search or jump to</span>
                <Kbd>Ctrl K</Kbd>
              </>
            )}
          </button>
        </Tooltip>
      </div>

      <nav className={cn('flex-1 space-y-5 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')} aria-label="Main">
        {NAV_GROUPS.map((group, groupIndex) => {
          const items = group.items.filter((item) => !item.capability || can(user?.role, item.capability))
          if (!items.length) return null
          return (
            <div key={group.label}>
              {collapsed ? (
                groupIndex > 0 && <div className="mx-2 mb-3 h-px bg-line" />
              ) : (
                <p className="mb-1.5 px-2.5 text-xs font-medium text-subtle">{group.label}</p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const count = item.badge === 'unread' ? unread?.count ?? 0 : 0
                  return (
                    <li key={item.to}>
                      <Tooltip label={item.label} side="right" disabled={!collapsed} className="w-full">
                        <NavLink
                          to={item.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              'relative flex h-9 w-full items-center gap-2.5 rounded-control text-sm font-medium transition-colors duration-150',
                              collapsed ? 'justify-center' : 'px-2.5',
                              isActive ? 'text-fg' : 'text-muted hover:bg-elevated/60 hover:text-fg',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.span
                                  layoutId={mobile ? 'nav-active-mobile' : 'nav-active'}
                                  className="absolute inset-0 rounded-control border border-line bg-elevated shadow-inset"
                                  transition={{ type: 'spring', duration: 0.3, bounce: 0.12 }}
                                />
                              )}
                              <item.icon className={cn('relative h-[18px] w-[18px] shrink-0', isActive && 'text-accent-ink')} weight={isActive ? 'fill' : 'regular'} />
                              <span className={cn('relative flex-1 truncate', collapsed && 'sr-only')}>{item.label}</span>
                              {count > 0 && (
                                <span
                                  className={cn(
                                    'relative inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent tabular',
                                    collapsed && 'absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]',
                                  )}
                                  aria-label={`${count} unread`}
                                >
                                  {count > 99 ? '99+' : count}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </Tooltip>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className={cn('space-y-2 border-t border-line py-3', collapsed ? 'px-2' : 'px-3')}>
        <Tooltip label={assistant.title} side="right" disabled={!collapsed} className="w-full">
          <div className={cn('flex items-center gap-2.5 rounded-control py-1.5 text-xs', collapsed ? 'justify-center' : 'px-2.5')} title={assistant.detail}>
            <AssistantDot status={system?.assistant} />
            {!collapsed && <span className="truncate text-muted">{assistant.title}</span>}
          </div>
        </Tooltip>

        {collapsed && onToggle && (
          <Tooltip label="Expand sidebar" side="right" className="w-full">
            <button onClick={onToggle} className="flex h-9 w-full items-center justify-center rounded-control text-subtle hover:bg-elevated hover:text-fg" aria-label="Expand sidebar" aria-expanded="false">
              <SidebarSimpleIcon />
            </button>
          </Tooltip>
        )}

        <Menu
          side="top"
          align="start"
          className="w-full"
          items={[
            { label: 'Settings', icon: <GearSixIcon />, onSelect: () => { onNavigate?.(); navigate('/settings') } },
            {
              label: `Theme: ${preference[0].toUpperCase()}${preference.slice(1)}`,
              icon: themeIcon[preference],
              onSelect: () => setPreference(nextTheme[preference]),
            },
            'divider' as const,
            { label: 'Sign out', icon: <SignOutIcon />, onSelect: () => void signOut(), danger: true },
          ]}
          trigger={(props) => (
            <button
              {...props}
              className={cn('flex w-full items-center gap-2.5 rounded-control py-1.5 text-left transition-colors hover:bg-elevated', collapsed ? 'justify-center' : 'px-1.5')}
              aria-label="Account menu"
            >
              <Avatar name={user?.display_name ?? 'You'} seed={user?.username} size="sm" />
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{user?.display_name}</span>
                  <span className="block truncate text-xs text-subtle">{user?.role}</span>
                </span>
              )}
            </button>
          )}
        />
      </div>
    </div>
  )
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()
  const outlet = useOutlet()
  const reduce = useReducedMotion()

  const toggle = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !value
    })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const sidebarProps = {
    onOpenPalette: () => setPaletteOpen(true),
  }

  return (
    <div className="flex min-h-[100dvh] bg-bg">
      <a href="#main" className="sr-only z-toast rounded-control bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>

      <aside
        className={cn(
          'sticky top-0 hidden h-[100dvh] shrink-0 border-r border-line bg-surface/60 transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        <Sidebar collapsed={collapsed} onToggle={toggle} {...sidebarProps} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-nav flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur-md lg:hidden">
          <button onClick={() => setDrawerOpen(true)} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-fg" aria-label="Open navigation" aria-expanded={drawerOpen}>
            <ListIcon className="h-5 w-5" />
          </button>
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-semibold">Infera</span>
          </NavLink>
          <button onClick={() => setPaletteOpen(true)} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-fg" aria-label="Search">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
        </header>

        <main id="main" className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="h-full"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-modal lg:hidden">
            <motion.div className="absolute inset-0 bg-[rgb(var(--shadow)/0.5)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-line bg-surface"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%', transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ duration: 0.36, ease: [0.32, 0.72, 0, 1] }}
              aria-label="Navigation"
            >
              <button onClick={() => setDrawerOpen(false)} className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-control text-subtle" aria-label="Close navigation">
                <XIcon />
              </button>
              <Sidebar collapsed={false} mobile onNavigate={() => setDrawerOpen(false)} {...sidebarProps} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
