import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'
import type {
  ChatSession,
  Conversation,
  Dashboard,
  DirectMessage,
  DocumentItem,
  FolderNode,
  LogEntry,
  Note,
  Paginated,
  Project,
  Source,
  SystemStatus,
  User,
} from '../lib/types'

/** "personal", a project id, or "all". */
export type Space = 'all' | 'personal' | number

const spaceParam = (space: Space) => (space === 'all' ? undefined : String(space))

const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get<T>(url, { params })).data

export const keys = {
  dashboard: ['dashboard'] as const,
  system: ['system'] as const,
  projects: ['projects'] as const,
  team: ['team'] as const,
  folders: (space: Space) => ['folders', space] as const,
  documents: (space: Space, folder?: number | 'root' | null) => ['documents', space, folder ?? 'any'] as const,
  notes: (space: Space) => ['notes', space] as const,
  sessions: ['sessions'] as const,
  session: (id: number) => ['session', id] as const,
  conversations: ['conversations'] as const,
  thread: (userId: number) => ['thread', userId] as const,
  unread: ['unread'] as const,
  logs: (filters: Record<string, string>) => ['logs', filters] as const,
}

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => get<Dashboard>('/dashboard/') })

export const useSystemStatus = () =>
  useQuery({ queryKey: keys.system, queryFn: () => get<SystemStatus>('/system/status/'), staleTime: 30_000, refetchInterval: 60_000 })

export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: () => get<Project[]>('/projects/') })

export const useTeam = (includeInactive = false) =>
  useQuery({
    queryKey: [...keys.team, includeInactive],
    queryFn: () => get<User[]>('/team/', includeInactive ? { include_inactive: 1 } : undefined),
    staleTime: 30_000,
  })

export const useFolderTree = (space: Space) =>
  useQuery({ queryKey: keys.folders(space), queryFn: () => get<FolderNode[]>('/folders/tree/', { space: spaceParam(space) }) })

const isIndexing = (items?: { status: string }[]) => items?.some((d) => d.status === 'pending' || d.status === 'processing')

export const useDocuments = (space: Space, folder?: number | 'root' | null) =>
  useQuery({
    queryKey: keys.documents(space, folder),
    queryFn: () =>
      get<DocumentItem[]>('/documents/', {
        space: spaceParam(space),
        ...(folder !== undefined && folder !== null ? { folder } : {}),
      }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (isIndexing(query.state.data) ? 2000 : false),
  })

export const useNotes = (space: Space) =>
  useQuery({
    queryKey: keys.notes(space),
    queryFn: () => get<Note[]>('/notes/', { space: spaceParam(space) }),
    placeholderData: keepPreviousData,
  })

export const useSessions = () => useQuery({ queryKey: keys.sessions, queryFn: () => get<ChatSession[]>('/chat/sessions/') })

export const useSession = (id: number | null) =>
  useQuery({
    queryKey: keys.session(id ?? 0),
    queryFn: () => get<ChatSession>(`/chat/sessions/${id}/`),
    enabled: id !== null,
  })

export const useConversations = () =>
  useQuery({ queryKey: keys.conversations, queryFn: () => get<Conversation[]>('/messages/conversations/'), refetchInterval: 8000 })

export const useThread = (userId: number | null) =>
  useQuery({
    queryKey: keys.thread(userId ?? 0),
    queryFn: () => get<DirectMessage[]>('/messages/', { user_id: userId }),
    enabled: userId !== null,
    refetchInterval: 4000,
  })

export const useUnread = () =>
  useQuery({ queryKey: keys.unread, queryFn: () => get<{ count: number }>('/messages/unread/'), refetchInterval: 15_000 })

export const useLogActions = () => useQuery({ queryKey: ['log-actions'], queryFn: () => get<string[]>('/logs/actions/') })

export const useLogs = (filters: Record<string, string>) =>
  useInfiniteQuery({
    queryKey: keys.logs(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => get<Paginated<LogEntry>>('/logs/', { ...filters, page: pageParam }),
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  })

export const useSearch = (q: string) =>
  useQuery({
    queryKey: ['search', q],
    queryFn: () => get<Source[]>('/search/', { q }),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
