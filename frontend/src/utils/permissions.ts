import { UserRole } from '../types/database';
import { useAuthStore } from '../store/useAuthStore';

export type Permission =
  | 'order.create'
  | 'order.send_kitchen'
  | 'kitchen.update'
  | 'bill.take'
  | 'discount.apply'
  | 'order.void'
  | 'refund.create'
  | 'menu.edit'
  | 'report.view'
  | 'expense.manage'
  | 'staff.manage'
  | 'device.manage';

export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  owner: [
    'order.create',
    'order.send_kitchen',
    'kitchen.update',
    'bill.take',
    'discount.apply',
    'order.void',
    'refund.create',
    'menu.edit',
    'report.view',
    'expense.manage',
    'staff.manage',
    'device.manage',
  ],
  manager: [
    'order.create',
    'order.send_kitchen',
    'kitchen.update',
    'bill.take',
    'discount.apply',
    'order.void',
    'refund.create',
    'menu.edit',
    'report.view',
    'expense.manage',
    'staff.manage',
    'device.manage',
  ],
  cashier: [
    'order.create',
    'order.send_kitchen',
    'kitchen.update',
    'bill.take',
    'discount.apply',
  ],
  waiter: [
    'order.create',
    'order.send_kitchen',
  ],
  kitchen: [
    'kitchen.update',
  ],
  accountant: [
    'report.view',
    'expense.manage',
  ],
};

/**
 * Checks whether a role has a given permission.
 */
export function hasPermissionForRole(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS_MAP[role] || [];
  return permissions.includes(permission);
}

/**
 * Convenience helper that checks permission for the currently active role in useAuthStore.
 */
export function can(permission: Permission): boolean {
  const currentRole = useAuthStore.getState().currentRole;
  return hasPermissionForRole(currentRole, permission);
}
