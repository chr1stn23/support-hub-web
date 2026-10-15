import { TicketStatus } from '@core/api/models';
import { statusAction } from '@features/tickets/status-actions';
import { isStaleTicketError } from '@features/tickets/ticket-errors';

describe('statusAction', () => {
  it.each<[TicketStatus, TicketStatus, string]>([
    ['IN_PROGRESS', 'WAITING', 'Poner en espera'],
    ['IN_PROGRESS', 'RESOLVED', 'Marcar como resuelto'],
    ['RESOLVED', 'CLOSED', 'Cerrar ticket'],
    ['OPEN', 'CANCELLED', 'Cancelar ticket'],
    ['WAITING', 'IN_PROGRESS', 'Reanudar el trabajo'],
    ['RESOLVED', 'IN_PROGRESS', 'Reabrir ticket'],
  ])('%s → %s is presented as "%s"', (from, to, title) => {
    expect(statusAction(from, to).title).toBe(title);
  });

  it('only warns about irreversibility for closing and cancelling', () => {
    const statuses: TicketStatus[] = [
      'OPEN',
      'IN_PROGRESS',
      'WAITING',
      'RESOLVED',
      'CLOSED',
      'CANCELLED',
    ];
    const destructive = statuses.filter((to) => statusAction('IN_PROGRESS', to).destructive);
    expect(destructive).toEqual(['CLOSED', 'CANCELLED']);
    expect(statusAction('RESOLVED', 'CLOSED').description).toContain('definitivo');
  });

  it('tells reopening apart from resuming: it asks for the reason', () => {
    expect(statusAction('RESOLVED', 'IN_PROGRESS').description).toContain('por qué');
    expect(statusAction('WAITING', 'IN_PROGRESS').description).not.toContain('por qué');
  });
});

describe('isStaleTicketError', () => {
  it.each([
    'INVALID_STATUS_TRANSITION',
    'FORBIDDEN',
    'TICKET_LOCKED',
    'TICKET_NOT_ASSIGNABLE',
    'TICKET_ALREADY_ASSIGNED',
    'RESOURCE_NOT_FOUND',
  ])('%s means the ticket changed under us', (code) => {
    expect(isStaleTicketError(code)).toBe(true);
  });

  it.each(['INVALID_ASSIGNEE', 'VALIDATION_ERROR', 'INTERNAL_ERROR', 'NETWORK_ERROR'])(
    '%s is something else: the dialog stays open',
    (code) => {
      expect(isStaleTicketError(code)).toBe(false);
    },
  );
});
