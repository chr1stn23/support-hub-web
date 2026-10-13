import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../core/auth/auth.service';
import { UserMenu } from './user-menu';

const settle = async () => {
  TestBed.inject(ApplicationRef).tick();
  await new Promise<void>((resolve) => setTimeout(resolve));
  TestBed.inject(ApplicationRef).tick();
};

describe('UserMenu', () => {
  function setup(roles: ('ADMIN' | 'AGENT' | 'ASSET_MANAGER' | 'USER')[] = ['USER']) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(AuthService);
    auth.login('a@b.c', 'x').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/login')
      .flush({
        tokenType: 'Bearer',
        expiresIn: 900,
        user: { id: 'u-1', email: 'a@b.c', fullName: 'Lucía Usuaria', active: true, roles },
      });

    const fixture = TestBed.createComponent(UserMenu);
    fixture.detectChanges();
    return { auth, fixture, el: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => {
    document
      .querySelectorAll('.cdk-overlay-container')
      .forEach((container) => (container.innerHTML = ''));
  });

  it('shows the name and the main role at a glance', () => {
    const { el } = setup(['USER']);
    expect(el.textContent).toContain('Lucía Usuaria');
    expect(el.textContent).toContain('Usuario');
  });

  it('shows the most influential role, and all of them as a tooltip', () => {
    const { el } = setup(['USER', 'AGENT']);
    const trigger = el.querySelector<HTMLButtonElement>('.trigger')!;
    expect(el.querySelector('.who__role')?.textContent).toBe('Agente');
    expect(trigger.getAttribute('title')).toBe('Agente · Usuario');
  });

  it('names the trigger for screen readers', () => {
    const { el } = setup();
    expect(el.querySelector('.trigger')?.getAttribute('aria-label')).toBe('Menú de Lucía Usuaria');
  });

  it('opens a menu with "Cerrar sesión" and signs out', async () => {
    const { auth, el } = setup();
    const logout = vi.spyOn(auth, 'logout').mockImplementation(() => undefined);

    el.querySelector<HTMLButtonElement>('.trigger')!.click();
    await settle();

    const item = document.querySelector<HTMLButtonElement>('[cdkMenuItem]');
    expect(item?.textContent).toContain('Cerrar sesión');

    item!.click();
    await settle();
    expect(logout).toHaveBeenCalledOnce();
  });
});
