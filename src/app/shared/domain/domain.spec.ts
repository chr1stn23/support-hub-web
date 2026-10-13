import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { AssetStatus, TicketPriority, TicketStatus } from '../../core/api/models';
import { AssetStatusChip } from './asset-status-chip';
import {
  ASSET_STATUS,
  ASSET_STATUS_ORDER,
  PRIORITY_ORDER,
  ROLE_LABEL,
  ROLE_ORDER,
  sortedRoleLabels,
  TICKET_PRIORITY,
  TICKET_STATUS,
  TICKET_STATUS_ORDER,
} from './labels';
import { PriorityBadge } from './priority-badge';
import { TicketStatusChip } from './ticket-status-chip';

describe('labels', () => {
  it('covers every ticket status, in workflow order, with a unique Spanish label', () => {
    expect(Object.keys(TICKET_STATUS).sort()).toEqual([...TICKET_STATUS_ORDER].sort());
    const labels = TICKET_STATUS_ORDER.map((s) => TICKET_STATUS[s].label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual([
      'Sin asignar',
      'En curso',
      'Esperando',
      'Resuelto',
      'Cerrado',
      'Cancelado',
    ]);
  });

  it('covers every asset status with a unique Spanish label', () => {
    expect(Object.keys(ASSET_STATUS).sort()).toEqual([...ASSET_STATUS_ORDER].sort());
    const labels = ASSET_STATUS_ORDER.map((s) => ASSET_STATUS[s].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('marks as "voided" only the statuses that are definitively out of play', () => {
    const voidedTickets = TICKET_STATUS_ORDER.filter((s) => TICKET_STATUS[s].voided);
    const voidedAssets = ASSET_STATUS_ORDER.filter((s) => ASSET_STATUS[s].voided);
    expect(voidedTickets).toEqual(['CANCELLED']);
    expect(voidedAssets).toEqual(['RETIRED']);
  });

  it('gives every priority a distinct icon (colour alone must not carry the meaning)', () => {
    const icons = PRIORITY_ORDER.map((p) => TICKET_PRIORITY[p].icon);
    expect(new Set(icons).size).toBe(PRIORITY_ORDER.length);
  });

  it('lists priorities from least to most severe', () => {
    expect(PRIORITY_ORDER).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  });

  it('names every role and sorts them by influence', () => {
    expect(ROLE_ORDER).toEqual(['ADMIN', 'AGENT', 'ASSET_MANAGER', 'USER']);
    expect(Object.keys(ROLE_LABEL).sort()).toEqual([...ROLE_ORDER].sort());
    expect(sortedRoleLabels(['USER', 'ADMIN'])).toEqual(['Administrador', 'Usuario']);
    expect(sortedRoleLabels(['USER'])).toEqual(['Usuario']);
    expect(sortedRoleLabels([])).toEqual([]);
  });
});

@Component({
  imports: [TicketStatusChip, AssetStatusChip, PriorityBadge],
  template: `
    <app-ticket-status status="IN_PROGRESS" />
    <app-ticket-status status="CANCELLED" />
    <app-asset-status status="MAINTENANCE" />
    <app-priority priority="CRITICAL" />
    <app-priority priority="LOW" [showLabel]="false" />
  `,
})
class Host {
  readonly _types?: [TicketStatus, AssetStatus, TicketPriority];
}

describe('domain components', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return {
      chips: Array.from<HTMLElement>(el.querySelectorAll('app-chip')),
      priorities: Array.from<HTMLElement>(el.querySelectorAll('app-priority')),
    };
  }

  it('shows the Spanish label with the tone of the status', () => {
    const { chips } = setup();
    expect(chips[0].textContent?.trim()).toBe('En curso');
    expect(chips[0].classList).toContain('tone-accent');
    expect(chips[2].textContent?.trim()).toBe('En mantenimiento');
    expect(chips[2].classList).toContain('tone-warning');
  });

  it('draws cancelled tickets as voided', () => {
    const { chips } = setup();
    expect(chips[1].textContent?.trim()).toBe('Cancelado');
    expect(chips[1].classList).toContain('is-voided');
    expect(chips[0].classList).not.toContain('is-voided');
  });

  it('shows the priority with its icon and text', () => {
    const { priorities } = setup();
    expect(priorities[0].textContent).toContain('Crítica');
    expect(priorities[0].querySelector('svg')).not.toBeNull();
    expect(priorities[0].hasAttribute('role')).toBe(false);
  });

  it('keeps an icon-only priority understandable for screen readers', () => {
    const { priorities } = setup();
    expect(priorities[1].textContent?.trim()).toBe('');
    expect(priorities[1].getAttribute('role')).toBe('img');
    expect(priorities[1].getAttribute('aria-label')).toBe('Prioridad baja');
    expect(priorities[1].getAttribute('title')).toBe('Baja');
  });
});
