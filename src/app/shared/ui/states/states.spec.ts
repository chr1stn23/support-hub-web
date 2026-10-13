import { Component, signal } from '@angular/core';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Skeleton } from './skeleton';
import { Spinner } from './spinner';
import { TestBed } from '@angular/core/testing';

const serverError = {
  timestamp: '',
  status: 500,
  code: 'INTERNAL_ERROR',
  message: 'stack trace secreto',
  path: '',
  fieldErrors: [],
};

@Component({
  imports: [EmptyState, ErrorState, Skeleton, Spinner],
  template: `
    <app-empty-state title="Aún no hay tickets" description="Crea el primero.">
      <button id="cta">Crear</button>
    </app-empty-state>
    <app-empty-state title="Sin icono" [icon]="null" />
    <app-error-state [error]="error()" (retry)="retries = retries + 1" />
    <app-error-state [error]="error()" [retryable]="false" />
    <app-skeleton [lines]="3" />
    <app-spinner label="Cargando tickets" />
  `,
})
class Host {
  error = signal<unknown>(serverError);
  retries = 0;
}

describe('states', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      el,
      host: fixture.componentInstance,
      q: (s: string) => Array.from<HTMLElement>(el.querySelectorAll(s)),
    };
  }

  it('empty state: title, description and the actions it receives', () => {
    const { q } = setup();
    const [withIcon, withoutIcon] = q('app-empty-state');
    expect(withIcon.querySelector('h3')?.textContent).toBe('Aún no hay tickets');
    expect(withIcon.textContent).toContain('Crea el primero.');
    expect(withIcon.querySelector('#cta')).not.toBeNull();
    expect(withIcon.querySelector('svg')).not.toBeNull();
    expect(withoutIcon.querySelector('svg')).toBeNull();
  });

  it('error state: Spanish message, never the server text, announced as an alert', () => {
    const { q } = setup();
    const [first] = q('app-error-state');
    expect(first.getAttribute('role')).toBe('alert');
    expect(first.textContent).toContain('Algo salió mal de nuestro lado');
    expect(first.textContent).not.toContain('stack trace');
  });

  it('error state: retry emits, and can be hidden', () => {
    const { fixture, host, q } = setup();
    const [first, second] = q('app-error-state');
    first.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();

    expect(host.retries).toBe(1);
    expect(second.querySelector('button')).toBeNull();
  });

  it('error state: copes with an unknown error', () => {
    const { fixture, host, q } = setup();
    host.error.set(new Error('boom'));
    fixture.detectChanges();
    expect(q('app-error-state')[0].textContent).toContain('Ocurrió un error inesperado');
  });

  it('skeleton: decorative, one bar per line, shorter last line', () => {
    const { q } = setup();
    const [skeleton] = q('app-skeleton');
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    const bars = Array.from<HTMLElement>(skeleton.querySelectorAll('.bar'));
    expect(bars).toHaveLength(3);
    expect(bars[0].style.width).toBe('100%');
    expect(bars[2].style.width).toBe('60%');
  });

  it('spinner: announces its label', () => {
    const { q } = setup();
    const [spinner] = q('app-spinner');
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.querySelector('.sr-only')?.textContent).toBe('Cargando tickets');
  });
});
