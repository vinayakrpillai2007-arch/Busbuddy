import { describe, expect, it } from 'vitest';
import { isRole } from './roles.js';

describe('trusted role claims', () => {
  it('accepts only the three server-assigned roles', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('student')).toBe(true);
    expect(isRole('driver')).toBe(true);
    expect(isRole('owner')).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole({ role: 'admin' })).toBe(false);
  });
});