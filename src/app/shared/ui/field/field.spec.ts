import { Component, signal } from '@angular/core';
import { Control } from './control';
import { Field } from './field';
import { TestBed } from '@angular/core/testing';

@Component({
  imports: [Field, Control],
  template: `
    <app-field
      label="Asunto"
      hint="Máximo 200 caracteres"
      [error]="error()"
      [required]="required()"
    >
      <input appControl type="text" />
    </app-field>
    <input appControl type="text" class="alone" />
  `,
})
class Host {
  readonly error = signal<string | null>(null);
  readonly required = signal(false);
}

describe('Field + Control', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      host: fixture.componentInstance,
      input: () => el.querySelector<HTMLInputElement>('app-field input')!,
      label: () => el.querySelector<HTMLLabelElement>('label')!,
      alone: () => el.querySelector<HTMLInputElement>('input.alone')!,
      byId: (id: string | null) => (id ? el.querySelector<HTMLElement>(`#${id}`) : null),
    };
  }

  it('links the label to the control', () => {
    const { input, label } = setup();
    expect(input().id).toBeTruthy();
    expect(label().getAttribute('for')).toBe(input().id);
    expect(label().textContent).toContain('Asunto');
  });

  it('styles the native element', () => {
    const { input } = setup();
    expect(input().classList).toContain('control');
  });

  it('describes the control with the hint when there is no error', () => {
    const { input, byId } = setup();
    expect(input().getAttribute('aria-invalid')).toBeNull();
    expect(byId(input().getAttribute('aria-describedby'))?.textContent).toContain(
      'Máximo 200 caracteres',
    );
  });

  it('switches to the error: invalid, announced, and described by the error text', () => {
    const { fixture, host, input, byId } = setup();
    host.error.set('Este campo es obligatorio.');
    fixture.detectChanges();

    expect(input().getAttribute('aria-invalid')).toBe('true');
    const message = byId(input().getAttribute('aria-describedby'));
    expect(message?.textContent).toContain('Este campo es obligatorio.');
    expect(message?.getAttribute('role')).toBe('alert');
  });

  it('goes back to the hint when the error is cleared', () => {
    const { fixture, host, input, byId } = setup();
    host.error.set('Mal');
    fixture.detectChanges();
    host.error.set(null);
    fixture.detectChanges();

    expect(input().getAttribute('aria-invalid')).toBeNull();
    expect(byId(input().getAttribute('aria-describedby'))?.textContent).toContain('Máximo 200');
  });

  it('marks required controls for assistive technology, and shows a visual asterisk', () => {
    const { fixture, host, input, label } = setup();
    expect(input().getAttribute('aria-required')).toBeNull();

    host.required.set(true);
    fixture.detectChanges();
    expect(input().getAttribute('aria-required')).toBe('true');
    expect(label().querySelector('[aria-hidden="true"]')?.textContent).toBe('*');
  });

  it('works outside a field without breaking', () => {
    const { alone } = setup();
    expect(alone().classList).toContain('control');
    expect(alone().hasAttribute('aria-describedby')).toBe(false);
  });

  it('gives every field its own id', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const second = TestBed.createComponent(Host);
    second.detectChanges();

    const a = fixture.nativeElement.querySelector('app-field input').id;
    const b = second.nativeElement.querySelector('app-field input').id;
    expect(a).not.toBe(b);
  });
});
