import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PasswordField } from '@shared/ui';

@Component({
  imports: [PasswordField],
  template: `<app-password-field
    label="Contraseña"
    hint="Mínimo 8"
    [error]="error()"
    [required]="true"
    [(value)]="value"
  />`,
})
class Host {
  value = signal('');
  readonly error = signal<string | null>(null);
}

describe('PasswordField', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      input: () => el.querySelector<HTMLInputElement>('input')!,
      toggle: () => el.querySelector<HTMLButtonElement>('button')!,
    };
  }

  it('hides what is typed, and labels the field', () => {
    const { input, el } = setup();
    expect(input().type).toBe('password');
    expect(el.querySelector('label')?.textContent).toContain('Contraseña');
    expect(el.textContent).toContain('Mínimo 8');
  });

  it('passes what is typed to the parent', () => {
    const { fixture, host, input } = setup();
    input().value = 'Demo1234!';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.value()).toBe('Demo1234!');
  });

  it('shows and hides the password with a button that says what it will do', () => {
    const { fixture, input, toggle } = setup();
    expect(toggle().getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');

    toggle().click();
    fixture.detectChanges();
    expect(input().type).toBe('text');
    expect(toggle().getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
  });

  it('does not submit a form when the button is pressed', () => {
    const { toggle } = setup();
    expect(toggle().type).toBe('button');
  });

  it('shows the error of the parent and marks the field as invalid', () => {
    const { fixture, host, input, el } = setup();
    host.error.set('Debe incluir al menos una letra y un número.');
    fixture.detectChanges();
    expect(el.textContent).toContain('Debe incluir al menos una letra y un número.');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });
});
