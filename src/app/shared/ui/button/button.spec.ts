import { Component, signal } from '@angular/core';
import { Button, ButtonVariant } from './button';
import { TestBed } from '@angular/core/testing';

@Component({
  imports: [Button],
  template: `
    <button appButton [variant]="variant()" [loading]="loading()" [disabled]="disabled()">
      Guardar
    </button>
    <a appButton href="/x">Enlace</a>
    <a appButton href="/y" disabled>Enlace deshabilitado</a>
    <button appButton iconOnly size="sm" aria-label="Cerrar">x</button>
    <button appButton type="submit">Enviar</button>
  `,
})
class Host {
  readonly variant = signal<ButtonVariant>('secondary');
  readonly loading = signal(false);
  readonly disabled = signal(false);
}

describe('Button', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const all = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[appButton]'));
    return {
      fixture,
      host: fixture.componentInstance,
      main: all[0],
      link: all[1],
      disabledLink: all[2],
      iconOnly: all[3],
      submit: all[4],
    };
  }

  it('applies the variant', () => {
    const { fixture, host, main } = setup();
    expect(main.classList).toContain('btn');
    expect(main.classList).not.toContain('btn--primary');

    host.variant.set('primary');
    fixture.detectChanges();
    expect(main.classList).toContain('btn--primary');
  });

  it('is type="button" by default so it never submits a form by accident', () => {
    const { main, submit } = setup();
    expect(main.getAttribute('type')).toBe('button');
    expect(submit.getAttribute('type')).toBe('submit');
  });

  it('does not put a type on links', () => {
    const { link } = setup();
    expect(link.hasAttribute('type')).toBe(false);
  });

  it('disables itself and announces it is busy while loading', () => {
    const { fixture, host, main } = setup();
    expect(main.hasAttribute('disabled')).toBe(false);
    expect(main.hasAttribute('aria-busy')).toBe(false);

    host.loading.set(true);
    fixture.detectChanges();
    expect(main.hasAttribute('disabled')).toBe(true);
    expect(main.getAttribute('aria-busy')).toBe('true');
    expect(main.querySelector('app-icon')).not.toBeNull();
  });

  it('can be disabled', () => {
    const { fixture, host, main } = setup();
    host.disabled.set(true);
    fixture.detectChanges();
    expect(main.hasAttribute('disabled')).toBe(true);
    expect(main.getAttribute('aria-disabled')).toBe('true');
  });

  it('takes a disabled link out of the tab order', () => {
    const { link, disabledLink } = setup();
    expect(link.hasAttribute('tabindex')).toBe(false);
    expect(disabledLink.getAttribute('tabindex')).toBe('-1');
    expect(disabledLink.getAttribute('aria-disabled')).toBe('true');
  });

  it('supports square icon-only buttons', () => {
    const { iconOnly } = setup();
    expect(iconOnly.classList).toContain('btn--icon');
    expect(iconOnly.classList).toContain('btn--sm');
  });
});
