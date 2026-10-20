import { expect, test, type Page } from '@playwright/test';

import { expectAccessible, waitForContent } from './support/a11y';
import { ACCOUNTS, NO_SESSION, RoleKey } from './support/accounts';

/** El primer enlace de una lista hacia un detalle: así se prueba un detalle sin conocer su identificador. */
async function firstDetailPath(
  page: Page,
  listPath: string,
  linkSelector: string,
): Promise<string> {
  await page.goto(listPath);
  await waitForContent(page);
  const href = await page.locator(linkSelector).first().getAttribute('href');
  expect(
    href,
    `No hay datos en ${listPath}: crea algunos con los datos de prueba de las entregas anteriores`,
  ).toBeTruthy();
  return href!;
}

test.describe('sin sesión', () => {
  test.use({ storageState: NO_SESSION });

  test('inicio de sesión', async ({ page }) => {
    await page.goto('/login');
    await waitForContent(page);
    await expectAccessible(page, '/login');
  });
});

const PAGES: Record<RoleKey, string[]> = {
  admin: [
    '/resumen',
    '/tickets',
    '/tickets/nuevo',
    '/mis-equipos',
    '/activos',
    '/usuarios',
    '/auditoria',
    '/notificaciones',
  ],
  agent: ['/resumen', '/tickets', '/activos'],
  assets: ['/resumen', '/activos'],
  user: [
    '/resumen',
    '/tickets',
    '/tickets/nuevo',
    '/mis-equipos',
    '/notificaciones',
    '/acceso-denegado',
  ],
};

for (const role of Object.keys(PAGES) as RoleKey[]) {
  test.describe(`rol ${role}`, () => {
    test.use({ storageState: ACCOUNTS[role].statePath });

    for (const path of PAGES[role]) {
      test(path, async ({ page }) => {
        await page.goto(path);
        await waitForContent(page);
        await expectAccessible(page, `${path} (${role})`);
      });
    }
  });
}

test.describe('detalles', () => {
  test.use({ storageState: ACCOUNTS.admin.statePath });

  test('detalle de un ticket', async ({ page }) => {
    const path = await firstDetailPath(page, '/tickets?vista=todos', 'tbody a[href^="/tickets/"]');
    await page.goto(path);
    await waitForContent(page);
    await expectAccessible(page, path);
  });

  test('detalle de un equipo', async ({ page }) => {
    const path = await firstDetailPath(page, '/activos', 'tbody a[href^="/activos/"]');
    await page.goto(path);
    await waitForContent(page);
    await expectAccessible(page, path);
  });

  test('detalle de un usuario', async ({ page }) => {
    const path = await firstDetailPath(page, '/usuarios', 'tbody a[href^="/usuarios/"]');
    await page.goto(path);
    await waitForContent(page);
    await expectAccessible(page, path);
  });
});

test.describe('elementos que se abren', () => {
  test.describe('menú de usuario', () => {
    test.use({ storageState: ACCOUNTS.admin.statePath });

    test('abierto', async ({ page }) => {
      await page.goto('/resumen');
      await waitForContent(page);
      await page.locator('app-user-menu button').click();
      await expect(page.getByRole('menuitem', { name: 'Cambiar contraseña' })).toBeVisible();
      await expectAccessible(page, 'el menú de usuario abierto');
    });
  });

  test.describe('diálogo', () => {
    test.use({ storageState: ACCOUNTS.assets.statePath });

    test('formulario de un equipo nuevo', async ({ page }) => {
      await page.goto('/activos');
      await waitForContent(page);
      await page.getByRole('button', { name: 'Nuevo equipo' }).click();
      await expect(page.getByRole('dialog', { name: 'Nuevo equipo' })).toBeVisible();
      await expectAccessible(page, 'el diálogo "Nuevo equipo"');
    });
  });
});
