export type Role = 'Founder' | 'HR' | 'PM' | 'Employee'
export type IndexStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type ProjectRole = 'owner' | 'editor' | 'viewer'

export interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  display_name: string
  email: string
  role: Role
  last_seen: string
  online: boolean
  is_active: boolean
  date_joined: string
}

export type Me = User

export interface ProjectMember {
  id: number
  user: User
  role: ProjectRole
  joined_at: string
}

export interface Project {
  id: number
  name: string
  description: string
  owner: User
  members: ProjectMember[]
  document_count: number
  note_count: number
  my_role: ProjectRole | null
  can_manage: boolean
  can_contribute: boolean
  created_at: string
}

export interface FolderNode {
  id: number
  name: string
  parent: number | null
  project: number | null
  created_at: string
  documents_count: number
  notes_count: number
  children: FolderNode[]
}

export interface DocumentItem {
  id: number
  title: string
  extension: string
  file_size: number
  project: number | null
  project_name: string | null
  folder: number | null
  uploaded_by: User
  status: IndexStatus
  error: string
  chunk_count: number
  indexed_at: string | null
  created_at: string
  can_delete: boolean
}

export interface Note {
  id: number
  title: string
  content: string
  folder: number | null
  project: number | null
  project_name: string | null
  author: User
  status: IndexStatus
  chunk_count: number
  created_at: string
  updated_at: string
  can_edit: boolean
}

export interface Source {
  n: number
  entity_type: 'document' | 'note'
  entity_id: number
  title: string
  chunk_index: number
  score: number
  snippet?: string
}

export interface ChatMessage {
  id: number | string
  role: 'user' | 'ai'
  content: string
  sources: Source[]
  created_at: string
}

export interface ChatSession {
  id: number
  title: string
  project: number | null
  selected_folder_ids: number[]
  selected_document_ids: number[]
  selected_note_ids: number[]
  message_count: number
  created_at: string
  updated_at: string
  messages?: ChatMessage[]
}

export interface DirectMessage {
  id: number | string
  sender_id: number
  receiver_id: number
  content: string
  is_read: boolean
  created_at: string
  pending?: boolean
}

export interface Conversation {
  user_id: number
  last_message: DirectMessage | null
  unread: number
}

export interface LogEntry {
  id: number
  action: string
  username: string | null
  display_name: string | null
  role: Role | null
  timestamp: string
  metadata: Record<string, unknown>
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface AssistantStatus {
  provider: 'ollama' | 'gemini' | 'extractive'
  model: string
  available: boolean
  detail: string
}

export interface SystemStatus {
  assistant: AssistantStatus
  embeddings: { backend: string; model: string }
  index: { chunks: number }
  upload: { max_mb: number; extensions: string[] }
}

export interface Dashboard {
  user: User
  stats: { projects: number; documents: number; notes: number; queries: number; team: number | null }
  index: Record<IndexStatus, number>
  query_series: { date: string; count: number }[]
  recent_activity: LogEntry[]
  recent_documents: DocumentItem[]
  recent_sessions: ChatSession[]
  assistant: AssistantStatus
}

export interface ChatScope {
  project_id: number | null
  folder_ids: number[]
  document_ids: number[]
  note_ids: number[]
}
