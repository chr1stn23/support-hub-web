import type { DashboardReport } from '@core/api/models';
import { buildCards } from './dashboard-cards';
import { report } from './dashboard-fixtures';

const ids = (cards: ReturnType<typeof buildCards>) => cards.map((card) => card.id);
const card = (cards: ReturnType<typeof buildCards>, id: string) => cards.find((c) => c.id === id)!;

describe('buildCards', () => {
  describe('someone who sees the whole operation', () => {
    it('shows open, unassigned, high priority, mine, resolved and the average time', () => {
      expect(ids(buildCards(report()))).toEqual([
        'open',
        'unassigned',
        'high',
        'mine',
        'resolved',
        'average',
      ]);
    });

    it('sends each card to its list, already filtered', () => {
      const cards = buildCards(report());
      expect(card(cards, 'open').link).toEqual({ params: {} });
      expect(card(cards, 'unassigned').link).toEqual({ params: { vista: 'sin-asignar' } });
      expect(card(cards, 'high').link).toEqual({ params: { vista: 'prioridad-alta' } });
      expect(card(cards, 'mine').link).toEqual({ params: { vista: 'mios' } });
      expect(card(cards, 'resolved').link).toEqual({ params: { vista: 'resueltos' } });
      expect(card(cards, 'average').link).toBeNull();
    });

    it('takes the numbers from the report', () => {
      const cards = buildCards(report());
      expect(card(cards, 'open').value).toBe('12');
      expect(card(cards, 'open').hint).toBe('20 creados en los últimos 30 días');
      expect(card(cards, 'mine').value).toBe('5');
      expect(card(cards, 'mine').hint).toBe('7 resueltos por ti en los últimos 30 días');
    });

    it('marks as needing attention what is unassigned or of high priority, only when there is some', () => {
      const cards = buildCards(report());
      expect(card(cards, 'unassigned').attention).toBe(true);
      expect(card(cards, 'high').attention).toBe(true);
      expect(card(cards, 'open').attention).toBe(false);

      const calm = buildCards(
        report({ tickets: { ...report().tickets, unassigned: 0, highPriorityOpen: 0 } }),
      );
      expect(card(calm, 'unassigned').attention).toBe(false);
      expect(card(calm, 'high').attention).toBe(false);
    });

    it('leaves out "assigned to me" when the report has no data for it', () => {
      expect(ids(buildCards(report({ mine: null })))).not.toContain('mine');
    });

    it('uses the singular for one', () => {
      const cards = buildCards(report({ tickets: { ...report().tickets, createdInPeriod: 1 } }));
      expect(card(cards, 'open').hint).toBe('1 creado en los últimos 30 días');
    });
  });

  describe('someone who only sees their own tickets', () => {
    const own = (overrides: Partial<DashboardReport> = {}) =>
      report({ scope: 'OWN', mine: null, assets: null, ...overrides });

    it('shows only what is about them, in their own words', () => {
      const cards = buildCards(own());
      expect(ids(cards)).toEqual(['open', 'unassigned', 'resolved', 'average']);
      expect(card(cards, 'open').label).toBe('Mis tickets abiertos');
      expect(card(cards, 'unassigned').label).toBe('Esperando a un agente');
    });

    it('does not mark anything as needing attention', () => {
      expect(buildCards(own()).every((c) => !c.attention)).toBe(true);
    });

    it('does not offer the "assigned to me" list, which is only for staff', () => {
      expect(buildCards(own()).every((c) => c.link?.params['vista'] !== 'mios')).toBe(true);
    });
  });

  it('says there is no average yet, instead of a number', () => {
    const cards = buildCards(
      report({ tickets: { ...report().tickets, avgResolutionHours: null } }),
    );
    expect(card(cards, 'average').value).toBe('—');
    expect(card(cards, 'average').hint).toBe('Aún no hay tickets resueltos');
  });

  it('follows the period of the report', () => {
    const cards = buildCards(report({ period: { from: '', to: '', days: 7 } }));
    expect(card(cards, 'resolved').hint).toBe('En los últimos 7 días');
  });
});
