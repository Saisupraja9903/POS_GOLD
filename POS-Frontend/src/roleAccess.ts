import type { PosUser } from './types';

export const POS_ROLES = {
  branchManager: 'BRANCH_MANAGER',
  salesManager: 'SALES_MANAGER',
  salesPerson: 'SALES_PERSON',
} as const;

export type PosRole = (typeof POS_ROLES)[keyof typeof POS_ROLES];

const ROLE_ALIASES: Record<string, PosRole> = {
  BRANCH_MANAGER: POS_ROLES.branchManager,
  BRANCHMANAGER: POS_ROLES.branchManager,
  SALES_MANAGER: POS_ROLES.salesManager,
  SALESMANAGER: POS_ROLES.salesManager,
  SALES_PERSON: POS_ROLES.salesPerson,
  SALESPERSON: POS_ROLES.salesPerson,
};

export function roleOf(user: PosUser): PosRole | null {
  const candidates = [user.role.code, user.role.name];
  for (const candidate of candidates) {
    const key = candidate.trim().replace(/[\s-]+/g, '_').toUpperCase();
    const role = ROLE_ALIASES[key] ?? ROLE_ALIASES[key.replaceAll('_', '')];
    if (role) return role;
  }
  return null;
}

export function homeFor(user: PosUser) {
  const role = roleOf(user);
  if (role === POS_ROLES.branchManager) return '/reports';
  if (role === POS_ROLES.salesManager) return '/team';
  return '/billing';
}

export function hasPermission(user: PosUser, permission: string) {
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

export function hasRole(user: PosUser, roles: readonly PosRole[]) {
  const role = roleOf(user);
  return role !== null && roles.includes(role);
}
