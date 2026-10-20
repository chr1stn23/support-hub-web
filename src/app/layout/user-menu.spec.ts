import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { UserMenu } from './user-menu';
import { DialogService } from '@shared/ui';
import { of } from 'rxjs';
import { ChangePasswordDialog } from '@features/account/change-password-dialog';

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

  it('names the trigger from visible text without overriding aria-label', () => {
    const { el } = setup();
    const trigger = el.querySelector<HTMLButtonElement>('.trigger');

    expect(trigger?.getAttribute('aria-label')).toBeNull();
    expect(trigger?.textContent).toContain('Lucía Usuaria');
    expect(trigger?.textContent).toContain('Usuario');
  });

  it('opens a menu with "Cerrar sesión" and signs out', async () => {
    const { auth, el } = setup();
    const logout = vi.spyOn(auth, 'logout').mockImplementation(() => undefined);

    el.querySelector<HTMLButtonElement>('.trigger')!.click();
    await settle();

    const item = Array.from(document.querySelectorAll<HTMLButtonElement>('[cdkMenuItem]')).find(
      (b) => b.textContent?.includes('Cerrar sesión'),
    );
    expect(item?.textContent).toContain('Cerrar sesión');

    item!.click();
    await settle();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('offers to change the password, and opens its dialog', async () => {
    const { el } = setup();
    const open = vi
      .spyOn(TestBed.inject(DialogService), 'open')
      .mockReturnValue({ closed: of(true) } as never);

    el.querySelector<HTMLButtonElement>('.trigger')!.click();
    await settle();

    const item = Array.from(document.querySelectorAll<HTMLButtonElement>('[cdkMenuItem]')).find(
      (b) => b.textContent?.includes('Cambiar contraseña'),
    )!;
    expect(item).toBeTruthy();

    item.click();
    await settle();

    await vi.waitFor(() => {
      expect(open).toHaveBeenCalledWith(
        ChangePasswordDialog,
        expect.objectContaining({ ariaLabel: 'Cambiar mi contraseña' }),
      );
    });
  });
});
