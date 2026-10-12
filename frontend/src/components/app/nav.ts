import {
  BooksIcon,
  ChatsCircleIcon,
  FingerprintIcon,
  NoteIcon,
  SparkleIcon,
  SquaresFourIcon,
  StackIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react'

import type { Capability } from '../../lib/rbac'

export interface NavItem {
  label: string
  to: string
  icon: Icon
  capability?: Capability
  badge?: 'unread'
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: SquaresFourIcon },
      { label: 'Ask Infera', to: '/chat', icon: SparkleIcon },
      { label: 'Documents', to: '/documents', icon: BooksIcon },
      { label: 'Notes', to: '/notes', icon: NoteIcon },
    ],
  },
  {
    label: 'Team',
    items: [
      { label: 'Projects', to: '/projects', icon: StackIcon },
      { label: 'Messages', to: '/messaging', icon: ChatsCircleIcon, badge: 'unread' },
      { label: 'People', to: '/team', icon: UsersThreeIcon, capability: 'viewTeam' },
      { label: 'Audit log', to: '/logs', icon: FingerprintIcon, capability: 'viewAuditLog' },
    ],
  },
]
