import type { Role } from './types'

/** Mirrors backend/accounts/roles.py. The server always enforces these too. */
const CAPABILITIES = {
  createProjects: ['Founder', 'PM'],
  viewTeam: ['Founder', 'HR'],
  addPeople: ['Founder', 'HR'],
  changeRoles: ['Founder'],
  viewAuditLog: ['Founder'],
} satisfies Record<string, Role[]>

export type Capability = keyof typeof CAPABILITIES

export const ROLES: Role[] = ['Founder', 'HR', 'PM', 'Employee']

export const ROLE_SUMMARY: Record<Role, string> = {
  Founder: 'Sees every project, manages people and roles, reads the audit log.',
  HR: 'Adds people to the workspace and keeps the team directory current.',
  PM: 'Creates projects and decides who can read or edit them.',
  Employee: 'Works inside the projects they are invited to, plus a private space.',
}

export function can(role: Role | undefined | null, capability: Capability): boolean {
  return !!role && (CAPABILITIES[capability] as readonly Role[]).includes(role)
}
