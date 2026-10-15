import { TicketHistoryEvent } from '@core/api/models';
import { describeEvent } from '@features/tickets/history-text';

const event = (overrides: Partial<TicketHistoryEvent>): TicketHistoryEvent => ({
  id: 'e-1',
  eventType: 'CREATED',
  actor: { id: 'u-1', fullName: 'Carlos Agente' },
  oldValue: null,
  newValue: null,
  note: null,
  createdAt: '2026-10-08T15:00:00Z',
  ...overrides,
});

describe('describeEvent', () => {
  it('CREATED', () => {
    expect(
      describeEvent(
        event({ eventType: 'CREATED', actor: { id: 'u-9', fullName: 'Lucía Usuaria' } }),
      ).summary,
    ).toBe('Lucía Usuaria creó el ticket');
  });

  describe('ASSIGNED', () => {
    it('an agent takes an unassigned ticket', () => {
      expect(
        describeEvent(event({ eventType: 'ASSIGNED', newValue: 'Carlos Agente' })).summary,
      ).toBe('Carlos Agente tomó el ticket');
    });

    it('someone assigns it to another person', () => {
      const e = event({
        eventType: 'ASSIGNED',
        actor: { id: 'a', fullName: 'Ana Admin' },
        newValue: 'Elena Agente',
      });
      expect(describeEvent(e).summary).toBe('Ana Admin asignó el ticket a Elena Agente');
    });

    it('an admin reassigns it from one agent to another', () => {
      const e = event({
        eventType: 'ASSIGNED',
        actor: { id: 'a', fullName: 'Ana Admin' },
        oldValue: 'Carlos Agente',
        newValue: 'Elena Agente',
      });
      expect(describeEvent(e).summary).toBe(
        'Ana Admin reasignó el ticket de Carlos Agente a Elena Agente',
      );
    });

    it('an admin takes it from someone else', () => {
      const e = event({
        eventType: 'ASSIGNED',
        actor: { id: 'a', fullName: 'Ana Admin' },
        oldValue: 'Carlos Agente',
        newValue: 'Ana Admin',
      });
      expect(describeEvent(e).summary).toBe(
        'Ana Admin se asignó el ticket (antes lo tenía Carlos Agente)',
      );
    });
  });

  describe('STATUS_CHANGED', () => {
    it('uses the Spanish labels of the statuses', () => {
      const text = describeEvent(
        event({ eventType: 'STATUS_CHANGED', oldValue: 'IN_PROGRESS', newValue: 'RESOLVED' }),
      );
      expect(text.summary).toBe('Carlos Agente cambió el estado de «En curso» a «Resuelto»');
    });

    it('works when there was no previous status', () => {
      expect(describeEvent(event({ eventType: 'STATUS_CHANGED', newValue: 'OPEN' })).summary).toBe(
        'Carlos Agente cambió el estado a «Sin asignar»',
      );
    });

    it('carries the note the person wrote', () => {
      const text = describeEvent(
        event({
          eventType: 'STATUS_CHANGED',
          oldValue: 'RESOLVED',
          newValue: 'IN_PROGRESS',
          note: 'Sigue fallando',
        }),
      );
      expect(text.note).toBe('Sigue fallando');
    });

    it('keeps an unknown status as it came, instead of failing', () => {
      expect(
        describeEvent(event({ eventType: 'STATUS_CHANGED', newValue: 'ARCHIVED' })).summary,
      ).toContain('«ARCHIVED»');
    });
  });

  describe('DETAILS_UPDATED', () => {
    it('names the field in Spanish and shows the change', () => {
      const text = describeEvent(
        event({
          eventType: 'DETAILS_UPDATED',
          note: 'title',
          oldValue: 'VPN',
          newValue: 'VPN caída',
        }),
      );
      expect(text.summary).toBe('Carlos Agente cambió el asunto');
      expect(text.detail).toBe('«VPN» → «VPN caída»');
    });

    it('translates the priorities', () => {
      const text = describeEvent(
        event({
          eventType: 'DETAILS_UPDATED',
          note: 'priority',
          oldValue: 'MEDIUM',
          newValue: 'CRITICAL',
        }),
      );
      expect(text.summary).toBe('Carlos Agente cambió la prioridad');
      expect(text.detail).toBe('«Media» → «Crítica»');
    });

    it('does not invent the texts of a description (the backend does not store them)', () => {
      const text = describeEvent(event({ eventType: 'DETAILS_UPDATED', note: 'description' }));
      expect(text.summary).toBe('Carlos Agente cambió la descripción');
      expect(text.detail).toBeNull();
    });

    it('handles the equipment, including the first time it is linked', () => {
      const linked = describeEvent(
        event({ eventType: 'DETAILS_UPDATED', note: 'asset', newValue: 'AST-000045' }),
      );
      expect(linked.summary).toBe('Carlos Agente cambió el equipo');
      expect(linked.detail).toBe('Ahora: «AST-000045»');
    });

    it('falls back to something generic for a field it does not know', () => {
      expect(describeEvent(event({ eventType: 'DETAILS_UPDATED', note: 'raro' })).summary).toBe(
        'Carlos Agente cambió los datos del ticket',
      );
    });

    it('never shows the field name as if it were a note', () => {
      expect(describeEvent(event({ eventType: 'DETAILS_UPDATED', note: 'title' })).note).toBeNull();
    });
  });
});
