import type { UserAdmin } from '@core/api/models';

export const userAdmin = (overrides: Partial<UserAdmin> = {}): UserAdmin => ({
  id: 'u-2',
  email: 'elena@supporthub.local',
  fullName: 'Elena Agente',
  active: true,
  roles: ['AGENT'],
  lastLoginAt: new Date(Date.now() - 600_000).toISOString(),
  createdAt: '2026-09-01T15:00:00Z',
  updatedAt: '2026-10-01T15:00:00Z',
  version: 3,
  ...overrides,
});

export const adminPage = (content: UserAdmin[], totalElements = content.length) => ({
  content,
  page: 0,
  size: 20,
  totalElements,
  totalPages: Math.max(1, Math.ceil(totalElements / 20)),
});
