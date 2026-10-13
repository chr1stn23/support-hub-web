import { Component, signal } from '@angular/core';
import { SortHeader } from './sort-header';
import { SortState } from './sort';
import { TestBed } from '@angular/core/testing';

@Component({
  imports: [SortHeader],
  template: `
    <table>
      <thead>
        <tr>
          <th appSortHeader="title" [sort]="sort()" (sortChange)="changes.push($event)">Asunto</th>
          <th
            appSortHeader="priority"
            firstDirection="desc"
            [sort]="sort()"
            (sortChange)="changes.push($event)"
          >
            Prioridad
          </th>
          <th>Estado</th>
        </tr>
      </thead>
    </table>
  `,
})
class Host {
  readonly sort = signal<SortState | null>(null);
  readonly changes: SortState[] = [];
}

describe('SortHeader', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const headers = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('th'));
    return { fixture, host: fixture.componentInstance, headers };
  }

  it('says which column is sorted, and how', () => {
    const { fixture, host, headers } = setup();
    expect(headers.map((h) => h.getAttribute('aria-sort'))).toEqual(['none', 'none', null]);

    host.sort.set({ property: 'title', direction: 'asc' });
    fixture.detectChanges();
    expect(headers[0].getAttribute('aria-sort')).toBe('ascending');
    expect(headers[1].getAttribute('aria-sort')).toBe('none');

    host.sort.set({ property: 'title', direction: 'desc' });
    fixture.detectChanges();
    expect(headers[0].getAttribute('aria-sort')).toBe('descending');
  });

  it('keeps the label inside a real button, reachable by keyboard', () => {
    const { headers } = setup();
    const button = headers[0].querySelector('button')!;
    expect(button.type).toBe('button');
    expect(button.textContent).toContain('Asunto');
  });

  it('leaves the other columns untouched', () => {
    const { headers } = setup();
    expect(headers[2].querySelector('button')).toBeNull();
  });

  it('emits ascending the first time, and toggles afterwards', () => {
    const { fixture, host, headers } = setup();
    headers[0].querySelector('button')!.click();
    expect(host.changes[0]).toEqual({ property: 'title', direction: 'asc' });

    host.sort.set(host.changes[0]);
    fixture.detectChanges();
    headers[0].querySelector('button')!.click();
    expect(host.changes[1]).toEqual({ property: 'title', direction: 'desc' });
  });

  it('respects the first direction of the column', () => {
    const { host, headers } = setup();
    headers[1].querySelector('button')!.click();
    expect(host.changes[0]).toEqual({ property: 'priority', direction: 'desc' });
  });
});
