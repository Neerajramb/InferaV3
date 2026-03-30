export const ROLES = {
  FOUNDER: 'Founder',
  HR: 'HR',
  PM: 'PM',
  EMPLOYEE: 'Employee'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  DASHBOARD: [ROLES.FOUNDER, ROLES.HR, ROLES.PM, ROLES.EMPLOYEE],
  TEAM: [ROLES.FOUNDER, ROLES.HR], // Only Founder & HR
  PROJECTS: [ROLES.FOUNDER, ROLES.HR, ROLES.PM, ROLES.EMPLOYEE],
  DOCUMENTS: [ROLES.FOUNDER, ROLES.HR, ROLES.PM, ROLES.EMPLOYEE],
  NOTES: [ROLES.FOUNDER, ROLES.HR, ROLES.PM, ROLES.EMPLOYEE],
  MESSAGING: [ROLES.FOUNDER, ROLES.HR, ROLES.PM, ROLES.EMPLOYEE],
  AI_CHAT: [ROLES.FOUNDER, ROLES.HR, ROLES.PM, ROLES.EMPLOYEE], // Everyone
  LOGS: [ROLES.FOUNDER], // Founder only
};

export const hasAccess = (userRole: string | undefined | null, requiredRoles: string[]): boolean => {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
};