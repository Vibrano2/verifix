/**
 * User Roles
 * Centralized role constants
 */

export const ROLES = {
  CLIENT: 'client',
  ARTISAN: 'artisan',
  ADMIN: 'admin'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Check if a role is valid
 */
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(ROLES).includes(role as UserRole);
};
