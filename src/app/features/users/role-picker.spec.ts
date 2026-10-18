import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { Role } from '@core/api/models';
import { RolePicker } from './role-picker';

@Component({
  imports: [RolePicker],
  template: `
    <app-role-picker
      label="Roles"
      [required]="true"
      [error]="error()"
      [lockedRoles]="locked()"
      lockedHint="No puedes quitarte tu propio rol de administrador."
      [(selected)]="selected"
    />
  `,
})
class Host {
  selected = signal<readonly Role[]>([]);
  readonly error = signal<string | null>(null);
  readonly locked = signal<readonly Role[]>([]);
}

describe('RolePicker', () => {
  function setup(initial: Role[] = []) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.selected.set(initial);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      boxes: () => Array.from(el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')),
    };
  }

  it('offers the four roles in Spanish, with what each one allows', () => {
    const { el, boxes } = setup();
    expect(boxes()).toHaveLength(4);
    const text = el.textContent ?? '';
    for (const label of ['Administrador', 'Agente', 'Gestor de activos', 'Usuario']) {
      expect(text).toContain(label);
    }
    expect(text).toContain('Atiende tickets');
  });

  it('is a labelled group, marked as required', () => {
    const { el } = setup();
    expect(el.querySelector('fieldset legend')?.textContent).toContain('Roles');
    expect(el.querySelector('.required')).not.toBeNull();
  });

  it('reflects the roles it receives', () => {
    const { boxes } = setup(['AGENT', 'USER']);
    expect(boxes().map((b) => b.checked)).toEqual([false, true, false, true]); // ADMIN, AGENT, ASSET_MANAGER, USER
  });

  it('hands back the chosen roles ordered by influence, whatever the order of the clicks', () => {
    const { fixture, host, boxes } = setup();
    boxes()[3].click(); // Usuario
    boxes()[0].click(); // Administrador
    fixture.detectChanges();
    expect(host.selected()).toEqual(['ADMIN', 'USER']);

    boxes()[3].click();
    fixture.detectChanges();
    expect(host.selected()).toEqual(['ADMIN']);
  });

  it('does not let a locked role change, and says why', () => {
    const { fixture, host, el, boxes } = setup(['ADMIN', 'USER']);
    host.locked.set(['ADMIN']);
    fixture.detectChanges();

    expect(boxes()[0].disabled).toBe(true);
    expect(boxes()[0].checked).toBe(true);
    expect(el.textContent).toContain('No puedes quitarte tu propio rol de administrador.');
  });

  it('shows no explanation when nothing is locked', () => {
    const { el } = setup();
    expect(el.textContent).not.toContain('No puedes quitarte');
  });

  it('shows the error of the parent as an alert, tied to the group', () => {
    const { fixture, host, el } = setup();
    host.error.set('Selecciona al menos un rol.');
    fixture.detectChanges();

    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Selecciona al menos un rol.');
    expect(el.querySelector('fieldset')?.getAttribute('aria-describedby')).toBe(alert?.id);
  });
});
