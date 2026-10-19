import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import type { DashboardReport } from '@core/api/models';
import { apiError } from '../assets/asset-fixtures';
import { DashboardPage } from './dashboard-page';
import { report } from './dashboard-fixtures';

const URL = '/api/v1/dashboard/summary';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const summary = (days?: number) =>
    http.expectOne(
      (r) => r.url === URL && (days === undefined || r.params.get('days') === String(days)),
    );
  const stat = (label: string) =>
    Array.from(el().querySelectorAll('.stat')).find(
      (s) => s.querySelector('.stat__label')?.textContent === label,
    );
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(DashboardPage);
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }
    await settle();
  }

  async function loadWith(data: DashboardReport = report()) {
    summary().flush(data);
    await settle();
  }

  afterEach(() => http.verify({ ignoreCancelled: true }));

  describe('the numbers', () => {
    it('asks for the last 30 days by default, and shows each figure with its label', async () => {
      await setup();
      summary(30).flush(report());
      await settle();

      expect(stat('Abiertos')?.querySelector('.stat__value')?.textContent).toBe('12');
      expect(stat('Sin asignar')?.querySelector('.stat__value')?.textContent).toBe('3');
      expect(stat('Prioridad alta')?.querySelector('.stat__value')?.textContent).toBe('4');
      expect(stat('Asignados a mí')?.querySelector('.stat__value')?.textContent).toBe('5');
      expect(stat('Resueltos')?.querySelector('.stat__value')?.textContent).toBe('15');
      expect(
        stat('Tiempo medio de resolución')?.querySelector('.stat__value')?.textContent,
      ).toMatch(/^5[.,]2 h$/);
    });

    it('sends each figure to its list, already filtered', async () => {
      await setup();
      await loadWith();

      expect(stat('Abiertos')?.getAttribute('href')).toBe('/tickets');
      expect(stat('Sin asignar')?.getAttribute('href')).toBe('/tickets?vista=sin-asignar');
      expect(stat('Prioridad alta')?.getAttribute('href')).toBe('/tickets?vista=prioridad-alta');
      expect(stat('Asignados a mí')?.getAttribute('href')).toBe('/tickets?vista=mios');
      expect(stat('Resueltos')?.getAttribute('href')).toBe('/tickets?vista=resueltos');
      expect(stat('Tiempo medio de resolución')?.tagName).toBe('DIV'); // no lleva a ninguna lista
    });

    it('marks what needs attention', async () => {
      await setup();
      await loadWith();
      expect(stat('Sin asignar')?.classList).toContain('is-attention');
      expect(stat('Abiertos')?.classList).not.toContain('is-attention');
    });

    it('shows someone who only sees their own tickets a shorter, personal summary', async () => {
      await setup();
      await loadWith(report({ scope: 'OWN', mine: null, assets: null }));

      expect(text()).toContain('Tus tickets de un vistazo.');
      expect(stat('Mis tickets abiertos')).toBeTruthy();
      expect(stat('Esperando a un agente')).toBeTruthy();
      expect(stat('Asignados a mí')).toBeUndefined();
      expect(el().querySelector('#assets-title')).toBeNull();
    });

    it('describes the operation for staff', async () => {
      await setup();
      await loadWith();
      expect(text()).toContain('El estado de la operación de un vistazo.');
    });
  });

  describe('the period', () => {
    it('offers 7, 30 and 90 days, with the current one chosen', async () => {
      await setup({ dias: '90' });
      summary(90).flush(report({ period: { from: '', to: '', days: 90 } }));
      await settle();

      const select = el().querySelector<HTMLSelectElement>('select')!;
      expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
        'Últimos 7 días',
        'Últimos 30 días',
        'Últimos 90 días',
      ]);
      expect(select.value).toBe('90');
    });

    it('ignores a period that is not offered', async () => {
      await setup({ dias: '500' });
      summary(30).flush(report());
    });

    it('changes through the URL, and does not write the default period', async () => {
      await setup();
      await loadWith();
      const select = el().querySelector<HTMLSelectElement>('select')!;

      select.value = '7';
      select.dispatchEvent(new Event('change'));
      expect(router.navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { dias: '7' } }),
      );

      select.value = '30';
      select.dispatchEvent(new Event('change'));
      expect(router.navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: {} }),
      );
    });

    it('keeps what it shows, dimmed, while the new period loads, and labels it with the period of its data', async () => {
      await setup();
      await loadWith();

      fixture.componentRef.setInput('dias', '7');
      await settle();

      expect(el().querySelector('.dash')?.classList).toContain('is-stale');
      expect(text()).toContain('Últimos 30 días'); // el título sigue siendo el de los datos que se ven
      expect(stat('Abiertos')).toBeTruthy();

      summary(7).flush(report({ period: { from: '', to: '', days: 7 } }));
      await settle();
      expect(el().querySelector('.dash')?.classList).not.toContain('is-stale');
      expect(text()).toContain('Últimos 7 días');
    });
  });

  describe('the trend chart', () => {
    it('describes itself to a screen reader, with the totals', async () => {
      await setup();
      await loadWith();

      const svg = el().querySelector('svg.chart')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe(
        'Tickets creados y resueltos por día en los últimos 30 días. En total: 6 creados y 6 resueltos.',
      );
    });

    it('draws the two lines, and a legend that does not depend on colour', async () => {
      await setup();
      await loadWith();

      expect(el().querySelector('polyline.line--created')?.getAttribute('points')).toBeTruthy();
      expect(el().querySelector('polyline.line--resolved')?.getAttribute('points')).toBeTruthy();
      const legend = (el().querySelector('.legend')?.textContent ?? '').replace(/\s+/g, ' ');
      expect(legend).toContain('Creados (6)');
      expect(legend).toContain('Resueltos (6)');
    });

    it('says that the days are counted in UTC', async () => {
      await setup();
      await loadWith();
      expect(text()).toContain('Los días se cuentan en UTC.');
    });

    it('offers the same data as a table, a row per day', async () => {
      await setup();
      await loadWith();

      const details = el().querySelector('details.data')!;
      expect(details.querySelector('summary')?.textContent).toBe('Ver los datos por día');
      const rows = Array.from(details.querySelectorAll('tbody tr')).map((tr) =>
        (tr.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );
      expect(rows).toEqual(['2026-10-06 2 1', '2026-10-07 4 3', '2026-10-08 0 2']);
    });

    it('says there was no movement, instead of drawing a flat line', async () => {
      await setup();
      await loadWith(
        report({
          tickets: {
            ...report().tickets,
            trend: [
              { day: '2026-10-07', created: 0, resolved: 0 },
              { day: '2026-10-08', created: 0, resolved: 0 },
            ],
          },
        }),
      );

      expect(text()).toContain('Sin movimiento en este período.');
      expect(el().querySelector('svg.chart')).toBeNull();
    });
  });

  describe('the breakdowns', () => {
    it('shows the tickets of every status in order, with the number written', async () => {
      await setup();
      await loadWith();

      const rows = Array.from(el().querySelectorAll('#status-title ~ .bars .bar-row')).map((r) =>
        (r.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );
      expect(rows).toHaveLength(6);
      expect(rows[0]).toContain('3');
      expect(rows[1]).toContain('En curso');
      expect(rows[1]).toContain('6');
    });

    it('shows the categories, the busiest first', async () => {
      await setup();
      await loadWith();

      const rows = Array.from(el().querySelectorAll('#category-title ~ .bars .bar-row')).map((r) =>
        (r.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );
      expect(rows).toEqual(['Hardware 8', 'Red 4']);
    });

    it('says when nothing was created in the period', async () => {
      await setup();
      await loadWith(report({ tickets: { ...report().tickets, byCategory: [] } }));
      expect(text()).toContain('Sin tickets creados en este período.');
    });

    it('shows the equipment, with each status leading to the inventory already filtered', async () => {
      await setup();
      await loadWith();

      expect(text()).toContain('Ver inventario (40)');
      const links = Array.from(
        el().querySelectorAll<HTMLAnchorElement>('#assets-title ~ .bars a.bar-row'),
      ).map((a) => a.getAttribute('href'));
      expect(links).toEqual([
        '/activos?estado=disponibles',
        '/activos?estado=asignados',
        '/activos?estado=mantenimiento',
        '/activos?estado=baja',
      ]);
      const types = Array.from(el().querySelectorAll('.subtitle ~ .bars .bar-row')).map((r) =>
        (r.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );
      expect(types).toEqual(['Laptop 25', 'Monitor 15']);
    });

    it('does not show the equipment to whoever does not receive it', async () => {
      await setup();
      await loadWith(report({ assets: null }));
      expect(el().querySelector('#assets-title')).toBeNull();
    });

    it('copes with a status or a kind of equipment missing from the report', async () => {
      await setup();
      await loadWith(report({ assets: { total: 3, byStatus: { AVAILABLE: 3 }, byType: [] } }));
      const rows = Array.from(el().querySelectorAll('#assets-title ~ .bars a.bar-row')).map((r) =>
        (r.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );
      expect(rows).toHaveLength(4);
      expect(rows[1]).toContain('0');
    });
  });

  describe('the recent activity', () => {
    it('tells what happened, with the note, and links to the ticket', async () => {
      await setup();
      await loadWith();

      const item = el().querySelector('.activity__item')!;
      expect(item.textContent).toContain(
        'Carlos Agente cambió el estado de «En curso» a «Resuelto»',
      );
      expect(item.textContent).toContain('“Se cambió la batería”');
      expect(item.querySelector('a')?.getAttribute('href')).toBe('/tickets/t-1');
      expect(item.textContent).toContain('TCK-000142');
      expect(item.textContent).toContain('Laptop no enciende');
      expect(item.textContent).toContain('hace 10 min');
    });

    it('shows ticket titles as plain text, never as HTML', async () => {
      await setup();
      await loadWith(
        report({
          recentActivity: [
            { ...report().recentActivity[0], ticketTitle: '<img src=x onerror=alert(1)>' },
          ],
        }),
      );
      expect(el().querySelector('.activity img')).toBeNull();
      expect(el().querySelector('.activity')?.textContent).toContain(
        '<img src=x onerror=alert(1)>',
      );
    });

    it('copes with an event whose author is unknown', async () => {
      await setup();
      await loadWith(report({ recentActivity: [{ ...report().recentActivity[0], actor: null }] }));
      expect(el().querySelector('.activity__summary')?.textContent).toContain(
        'Alguien cambió el estado',
      );
    });

    it('says when there is nothing recent', async () => {
      await setup();
      await loadWith(report({ recentActivity: [] }));
      expect(text()).toContain('Sin actividad reciente.');
    });
  });

  describe('loading, errors and refreshing', () => {
    it('shows a skeleton while it loads', async () => {
      await setup();
      expect(el().querySelector('[aria-label="Cargando el resumen"]')).not.toBeNull();
      await loadWith();
      expect(el().querySelector('[aria-label="Cargando el resumen"]')).toBeNull();
    });

    it('shows the error, with a retry that loads again', async () => {
      await setup();
      summary().flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      await settle();
      expect(text()).toContain('No pudimos cargar el resumen');

      Array.from(el().querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Reintentar')!
        .click();
      await settle();
      await loadWith();
      expect(stat('Abiertos')).toBeTruthy();
    });

    it('reloads when asked to, and says when it was last updated', async () => {
      await setup();
      await loadWith();
      expect(text()).toContain('Actualizado');

      Array.from(el().querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Actualizar')!
        .click();
      await settle();
      await loadWith(report({ tickets: { ...report().tickets, open: 99 } }));
      expect(stat('Abiertos')?.querySelector('.stat__value')?.textContent).toBe('99');
    });
  });
});
