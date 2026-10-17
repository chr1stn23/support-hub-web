import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { UserLookup } from '@core/api/models';
import { PersonPicker } from './person-picker';

const person = (id: string, fullName: string) => ({ id, fullName, email: `${id}@x.com` });
const pageOf = (content: UserLookup[], totalElements = content.length) => ({
  content,
  page: 0,
  size: 20,
  totalElements,
  totalPages: 1,
});
const LOOKUP = (r: { url: string }) => r.url === '/api/v1/users/lookup';

@Component({
  imports: [PersonPicker],
  template: `
    <app-person-picker
      label="Asignar a"
      [required]="true"
      [excludeId]="exclude()"
      [error]="error()"
      [(selected)]="selected"
    />
  `,
})
class Host {
  readonly exclude = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  selected = signal<UserLookup | null>(null);
}

describe('PersonPicker', () => {
  let fixture: ComponentFixture<Host>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const radios = () => Array.from(el().querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const settle = async () => {
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
  };

  async function setup(
    first: UserLookup[] = [person('u-1', 'Ana Admin'), person('u-2', 'Carlos Agente')],
    total = first.length,
  ) {
    fixture = TestBed.createComponent(Host);
    await settle();
    http.expectOne(LOOKUP).flush(pageOf(first, total));
    await settle();
  }

  it('shows the first people as soon as it opens, with name and email', async () => {
    await setup();
    expect(radios()).toHaveLength(2);
    expect(text()).toContain('Ana Admin');
    expect(text()).toContain('u-1@x.com');
    expect(text()).toContain('Carlos Agente');
  });

  it('asks for 20 people and no search text at first', async () => {
    fixture = TestBed.createComponent(Host);
    await settle();

    const request = http.expectOne(LOOKUP);
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('search')).toBe(false);
    request.flush(pageOf([]));
  });

  it('leaves out the person that must not appear', async () => {
    await setup();
    fixture.componentInstance.exclude.set('u-1');
    await settle();

    expect(radios().map((radio) => radio.value)).toEqual(['u-2']);
  });

  it('is a labelled group of options that share one name, so the arrow keys move between them', async () => {
    await setup();
    expect(el().querySelector('fieldset legend')?.textContent).toContain('Asignar a');
    expect(new Set(radios().map((radio) => radio.name)).size).toBe(1);
  });

  it('marks the choice and passes it to the parent', async () => {
    await setup();
    radios()[1].click();
    await settle();

    expect(fixture.componentInstance.selected()).toEqual(person('u-2', 'Carlos Agente'));
    expect(radios()[1].checked).toBe(true);
    expect(el().querySelector('.option.is-selected')?.textContent).toContain('Carlos Agente');
  });

  it('shows the error of the parent, announced and tied to the group', async () => {
    await setup();
    fixture.componentInstance.error.set('Selecciona a quién asignarlo.');
    await settle();

    const alert = el().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Selecciona a quién asignarlo.');
    expect(el().querySelector('fieldset')?.getAttribute('aria-describedby')).toBe(alert?.id);
  });

  it('marks the group as required', async () => {
    await setup();
    expect(el().querySelector('.required')).not.toBeNull();
  });

  it('says there are more people than the ones shown', async () => {
    await setup([person('u-1', 'Ana Admin')], 57);
    expect(text()).toContain('Mostrando 1 de 57. Escribe para afinar la búsqueda.');
  });

  it('says it when nobody matches the search', async () => {
    vi.useFakeTimers();
    await setup();

    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(350);
    fixture.detectChanges();

    http.expectOne((r) => LOOKUP(r) && r.params.get('search') === 'zzz').flush(pageOf([]));

    vi.useRealTimers();
    await settle();
    expect(text()).toContain('Nadie coincide con «zzz».');
  });

  it('waits for the person to stop typing before searching, and keeps the choice while the list changes', async () => {
    vi.useFakeTimers();
    await setup();

    radios()[0].click();
    fixture.detectChanges();

    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'car';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(200);
    fixture.detectChanges();
    http.expectNone((r) => LOOKUP(r) && r.params.get('search') === 'car');

    await vi.advanceTimersByTimeAsync(150);
    fixture.detectChanges();
    http
      .expectOne((r) => LOOKUP(r) && r.params.get('search') === 'car')
      .flush(pageOf([person('u-2', 'Carlos Agente')]));
    vi.useRealTimers();
    await settle();

    expect(radios().map((radio) => radio.value)).toEqual(['u-2']);
    expect(fixture.componentInstance.selected()?.id).toBe('u-1'); // lo elegido antes no se pierde
  });

  it('does not submit the surrounding form when Enter is pressed in the search box', async () => {
    await setup();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true });
    el().querySelector('input[type="search"]')!.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
  });

  it('shows the error with a retry', async () => {
    fixture = TestBed.createComponent(Host);
    await settle();

    http.expectOne(LOOKUP).flush(
      {
        timestamp: '',
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'x',
        path: '',
        fieldErrors: [],
      },
      { status: 500, statusText: 'Error' },
    );
    await settle();
    expect(text()).toContain('No pudimos cargar a las personas');

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reintentar')!
      .click();
    await settle();
    http.expectOne(LOOKUP).flush(pageOf([person('u-1', 'Ana Admin')]));
    await settle();
    expect(text()).toContain('Ana Admin');
  });

  it('shows a skeleton while the first people load', async () => {
    fixture = TestBed.createComponent(Host);
    await settle();

    expect(el().querySelector('[aria-label="Cargando personas"]')).not.toBeNull();
    http.expectOne(LOOKUP).flush(pageOf([]));
  });
});
