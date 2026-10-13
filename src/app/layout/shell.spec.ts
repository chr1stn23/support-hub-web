import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Shell } from './shell';
import { Role } from '@core/api/models';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '@core/auth/auth.service';

@Component({ template: 'página' })
class Dummy {}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;

  const el = () => fixture.nativeElement as HTMLElement;
  const links = () =>
    Array.from(el().querySelectorAll<HTMLAnchorElement>('.sidebar .link')).map((a) =>
      a.textContent?.trim(),
    );

  async function setup(roles: Role[], unread = 0) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'resumen', component: Dummy }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(AuthService).login('a@b.c', 'x').subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'u-1', email: 'a@b.c', fullName: 'Lucía Usuaria', active: true, roles },
    });

    fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    http.expectOne('/api/v1/notifications/unread-count').flush({ count: unread });
    await settle();
    fixture.detectChanges();
  }

  it('shows the navigation that matches the role', async () => {
    await setup(['USER']);
    expect(links()).toEqual(['Resumen', 'Tickets', 'Mis equipos']);
  });

  it('shows everything to an administrator', async () => {
    await setup(['ADMIN']);
    expect(links()).toEqual([
      'Resumen',
      'Tickets',
      'Mis equipos',
      'Inventario',
      'Usuarios',
      'Auditoría',
    ]);
  });

  it('keeps "Nuevo ticket" at hand for everyone', async () => {
    await setup(['USER']);
    const cta = el().querySelector<HTMLAnchorElement>('.new-ticket')!;
    expect(cta.textContent).toContain('Nuevo ticket');
    expect(cta.getAttribute('href')).toBe('/tickets/nuevo');
  });

  it('shows how many notifications are unread, in the badge and for screen readers', async () => {
    await setup(['USER'], 3);
    expect(el().querySelector('.bell__badge')?.textContent?.trim()).toBe('3');
    expect(el().querySelector('.bell a')?.getAttribute('aria-label')).toBe(
      'Notificaciones, 3 sin leer',
    );
  });

  it('caps the badge at 99+', async () => {
    await setup(['USER'], 250);
    expect(el().querySelector('.bell__badge')?.textContent?.trim()).toBe('99+');
  });

  it('hides the badge when there is nothing unread', async () => {
    await setup(['USER'], 0);
    expect(el().querySelector('.bell__badge')).toBeNull();
    expect(el().querySelector('.bell a')?.getAttribute('aria-label')).toBe('Notificaciones');
  });

  it('offers a link to skip to the main content', async () => {
    await setup(['USER']);
    const skip = el().querySelector<HTMLAnchorElement>('.skip-link')!;
    expect(skip.getAttribute('href')).toBe('#main-content');
    expect(el().querySelector('#main-content')?.getAttribute('tabindex')).toBe('-1');
  });

  it('opens and closes the menu on narrow screens, and Escape closes it', async () => {
    await setup(['USER']);
    const toggle = el().querySelector<HTMLButtonElement>('.menu-button')!;
    const sidebar = el().querySelector('.sidebar')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.classList).toContain('is-open');
    expect(el().querySelector('.scrim')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(sidebar.classList).not.toContain('is-open');
  });

  it('closes the menu when the dimmed background is clicked', async () => {
    await setup(['USER']);
    el().querySelector<HTMLButtonElement>('.menu-button')!.click();
    fixture.detectChanges();

    el().querySelector<HTMLElement>('.scrim')!.click();
    fixture.detectChanges();
    expect(el().querySelector('.sidebar')?.classList).not.toContain('is-open');
  });
});
