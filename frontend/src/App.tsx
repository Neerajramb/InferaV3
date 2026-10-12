import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'

import AppShell from './components/app/AppShell'
import { ConfirmHost } from './components/ui/Confirm'
import { api } from './lib/api'
import { can, type Capability } from './lib/rbac'
import type { Me } from './lib/types'
import { useAuth } from './store/auth'
import { useTheme } from './store/theme'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Chat = lazy(() => import('./pages/Chat'))
const Documents = lazy(() => import('./pages/Documents'))
const Notes = lazy(() => import('./pages/Notes'))
const Projects = lazy(() => import('./pages/Projects'))
const Messaging = lazy(() => import('./pages/Messaging'))
const Team = lazy(() => import('./pages/Team'))
const Logs = lazy(() => import('./pages/Logs'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AccessDenied = lazy(() => import('./pages/AccessDenied'))

function RequireAuth({ children }: { children: ReactNode }) {
  const access = useAuth((s) => s.access)
  const location = useLocation()
  if (!access) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}

function RequireCapability({ capability, children }: { capability: Capability; children: ReactNode }) {
  const role = useAuth((s) => s.user?.role)
  return can(role, capability) ? <>{children}</> : <AccessDenied />
}

/** Refresh the cached profile on load so role changes made elsewhere take effect. */
function useSessionBootstrap() {
  const access = useAuth((s) => s.access)
  useEffect(() => {
    if (!access) return
    api
      .get<Me>('/auth/me/')
      .then(({ data }) => useAuth.getState().setUser(data))
      .catch(() => undefined)
    // Only on first load; token rotation should not refetch.
  }, [])
}

function ThemedToaster() {
  const preference = useTheme((s) => s.preference)
  return (
    <Toaster
      theme={preference}
      position="bottom-right"
      offset={20}
      toastOptions={{
        classNames: {
          toast: '!bg-elevated !border-line !text-fg !rounded-control !shadow-pop !font-sans',
          description: '!text-muted',
        },
      }}
    />
  )
}

export default function App() {
  useSessionBootstrap()
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-[100dvh] bg-bg" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="documents" element={<Documents />} />
            <Route path="notes" element={<Notes />} />
            <Route path="projects" element={<Projects />} />
            <Route path="messaging" element={<Messaging />} />
            <Route path="settings" element={<Settings />} />
            <Route path="team" element={<RequireCapability capability="viewTeam"><Team /></RequireCapability>} />
            <Route path="logs" element={<RequireCapability capability="viewAuditLog"><Logs /></RequireCapability>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <ConfirmHost />
      <ThemedToaster />
    </BrowserRouter>
  )
}
