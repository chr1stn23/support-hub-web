import type { DashboardReport } from '@core/api/models';

export const report = (overrides: Partial<DashboardReport> = {}): DashboardReport => ({
  scope: 'ALL',
  period: { from: '2026-09-08T00:00:00Z', to: '2026-10-08T00:00:00Z', days: 30 },
  tickets: {
    open: 12,
    unassigned: 3,
    highPriorityOpen: 4,
    byStatus: { OPEN: 3, IN_PROGRESS: 6, WAITING: 3, RESOLVED: 5, CLOSED: 10, CANCELLED: 2 },
    createdInPeriod: 20,
    resolvedInPeriod: 15,
    avgResolutionHours: 5.2,
    byCategory: [
      { category: 'Red', count: 4 },
      { category: 'Hardware', count: 8 },
    ],
    trend: [
      { day: '2026-10-06', created: 2, resolved: 1 },
      { day: '2026-10-07', created: 4, resolved: 3 },
      { day: '2026-10-08', created: 0, resolved: 2 },
    ],
  },
  mine: { assignedOpen: 5, resolvedInPeriod: 7 },
  assets: {
    total: 40,
    byStatus: { AVAILABLE: 12, ASSIGNED: 20, MAINTENANCE: 5, RETIRED: 3 },
    byType: [
      { type: 'Monitor', count: 15 },
      { type: 'Laptop', count: 25 },
    ],
  },
  recentActivity: [
    {
      at: new Date(Date.now() - 600_000).toISOString(),
      eventType: 'STATUS_CHANGED',
      actor: { id: 'a-1', fullName: 'Carlos Agente' },
      ticketId: 't-1',
      ticketCode: 'TCK-000142',
      ticketTitle: 'Laptop no enciende',
      oldValue: 'IN_PROGRESS',
      newValue: 'RESOLVED',
      note: 'Se cambió la batería',
    },
  ],
  generatedAt: new Date().toISOString(),
  ...overrides,
});
