export type Role = 'admin' | 'student' | 'driver';

export function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'student' || value === 'driver';
}