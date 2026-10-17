import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { AssetAssignment } from '@core/api/models';
import { AssignmentTimeline } from './assignment-timeline';

const assignment = (overrides: Partial<AssetAssignment>): AssetAssignment => ({
  id: 'x-1',
  user: { id: 'u-1', fullName: 'Lucía Usuaria' },
  assignedBy: { id: 'u-5', fullName: 'Mario Activos' },
  assignedAt: '2026-10-05T15:00:00Z',
  returnedAt: null,
  notes: null,
  ...overrides,
});

@Component({
  imports: [AssignmentTimeline],
  template: `<app-assignment-timeline [assignments]="items" />`,
})
class Host {
  items: AssetAssignment[] = [];
}

describe('AssignmentTimeline', () => {
  function render(items: AssetAssignment[]) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.items = items;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      el,
      rows: () =>
        Array.from(el.querySelectorAll('.item')).map((i) =>
          (i.textContent ?? '').replace(/\s+/g, ' ').trim(),
        ),
    };
  }

  it('shows the assignments in the order it receives them (newest first), marking the current one', () => {
    const { rows } = render([
      assignment({ id: 'x-2', user: { id: 'u-2', fullName: 'Elena Agente' } }),
      assignment({
        id: 'x-1',
        returnedAt: '2026-10-04T15:00:00Z',
        assignedAt: '2026-09-01T15:00:00Z',
      }),
    ]);

    expect(rows()[0]).toContain('Elena Agente');
    expect(rows()[0]).toContain('Actual');
    expect(rows()[1]).toContain('Lucía Usuaria');
    expect(rows()[1]).not.toContain('Actual');
  });

  it('says who assigned it, and when it was returned', () => {
    const { rows } = render([assignment({ returnedAt: '2026-10-06T15:00:00Z' })]);
    expect(rows()[0]).toContain('Asignado por Mario Activos');
    expect(rows()[0]).toContain('Devuelto');
  });

  it('shows the note as plain text, never as HTML', () => {
    const { el, rows } = render([assignment({ notes: '<b>Urgente</b> para teletrabajo' })]);
    expect(rows()[0]).toContain('“<b>Urgente</b> para teletrabajo”');
    expect(el.querySelector('.note b')).toBeNull();
  });

  it('says so when the equipment was never assigned', () => {
    const { el } = render([]);
    expect(el.textContent).toContain('Este equipo todavía no se ha asignado a nadie.');
  });
});
