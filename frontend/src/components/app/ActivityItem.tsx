import {
  ArrowsLeftRightIcon,
  FileArrowUpIcon,
  FolderPlusIcon,
  KeyIcon,
  NoteIcon,
  SignInIcon,
  SparkleIcon,
  StackIcon,
  TrashIcon,
  UserGearIcon,
  UserPlusIcon,
  type Icon,
} from '@phosphor-icons/react'

import type { LogEntry } from '../../lib/types'

const str = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '')

/** Plain-language description and icon for an audit log action. */
export function describeLog(log: LogEntry): { icon: Icon; text: string } {
  const m = log.metadata
  switch (log.action) {
    case 'login': return { icon: SignInIcon, text: 'signed in' }
    case 'ai_query': return { icon: SparkleIcon, text: `asked a question${m.sources ? ` (${str(m.sources)} sources)` : ''}` }
    case 'document_uploaded': return { icon: FileArrowUpIcon, text: `uploaded ${str(m.title)}` }
    case 'document_deleted': return { icon: TrashIcon, text: `deleted ${str(m.title)}` }
    case 'note_created': return { icon: NoteIcon, text: `wrote a note: ${str(m.title)}` }
    case 'note_deleted': return { icon: TrashIcon, text: `deleted the note ${str(m.title)}` }
    case 'folder_created': return { icon: FolderPlusIcon, text: `created the folder ${str(m.folder)}` }
    case 'folder_deleted': return { icon: TrashIcon, text: `deleted the folder ${str(m.folder)}` }
    case 'project_created': return { icon: StackIcon, text: `created the project ${str(m.project)}` }
    case 'project_updated': return { icon: StackIcon, text: `updated the project ${str(m.project)}` }
    case 'project_deleted': return { icon: TrashIcon, text: `deleted the project ${str(m.project)}` }
    case 'member_added': return { icon: UserPlusIcon, text: `added ${str(m.username)} to ${str(m.project)}` }
    case 'member_removed': return { icon: UserGearIcon, text: `removed ${str(m.username)} from ${str(m.project)}` }
    case 'member_role_changed': return { icon: UserGearIcon, text: `made ${str(m.username)} ${str(m.role)} on ${str(m.project)}` }
    case 'member_created': return { icon: UserPlusIcon, text: `added ${str(m.username)} to the workspace as ${str(m.role)}` }
    case 'member_updated': return { icon: UserGearIcon, text: `updated ${str(m.username)}${m.role ? ` to ${str(m.role)}` : ''}${m.is_active === false ? ' (deactivated)' : ''}` }
    case 'role_switched': return { icon: ArrowsLeftRightIcon, text: `previewed the ${str(m.new_role)} role` }
    case 'password_changed': return { icon: KeyIcon, text: 'changed their password' }
    default: return { icon: SparkleIcon, text: log.action.replace(/_/g, ' ') }
  }
}
