import { expect, test, type Browser, type Page } from '@playwright/test';

import { expectAccessible, waitForContent } from './support/a11y';
import { ACCOUNTS, NO_SESSION, RoleKey } from './support/accounts';
import { openSession } from './support/session';

async function createTicketPath(browser: Browser): Promise<string> {
  const user = await openSession(browser, 'user');

  try {
    const title = `A11y ${Date.now()}`;

    await user.page.goto('/tickets/nuevo');
    await user.page.getByLabel('Asunto').fill(title);
    await user.page.getByLabel('Categoría').selectOption({ index: 1 });
    await user.page.getByLabel('Descripción').fill('Ticket para la prueba de accesibilidad.');
    await user.page.getByRole('button', { name: 'Crear ticket' }).click();

    await expect(user.page).toHaveURL(/\/tickets\/[0-9a-f-]{36}$/);
    return new URL(user.page.url()).pathname;
  } finally {
    await user.context.close();
  }
}

async function createAssetPath(browser: Browser): Promise<string> {
  const manager = await openSession(browser, 'assets');

  try {
    const stamp = Date.now();
    const model = `A11y-${stamp}`;

    await manager.page.goto('/activos');
    await manager.page.getByRole('button', { name: 'Nuevo equipo' }).click();

    const form = manager.page.getByRole('dialog', { name: 'Nuevo equipo' });
    await form.getByLabel('Tipo').selectOption({ index: 1 });
    await form.getByLabel('Marca').fill('E2E');
    await form.getByLabel('Modelo').fill(model);
    await form.getByLabel('Número de serie').fill(`A11Y-${stamp}`);
    await form.getByRole('button', { name: 'Registrar equipo' }).click();

    await expect(manager.page).toHaveURL(/\/activos\/[0-9a-f-]{36}$/);
    return new URL(manager.page.url()).pathname;
  } finally {
    await manager.context.close();
  }
}

async function firstDetailPath(
  page: Page,
  listPath: string,
  linkSelector: string,
): Promise<string> {
  await page.goto(listPath);
  await waitForContent(page);

  const href = await page.locator(linkSelector).first().getAttribute('href');

  expect(href, `No hay datos en ${listPath} para probar el detalle`).toBeTruthy();

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

  test('detalle de un ticket', async ({ page, browser }) => {
    const path = await createTicketPath(browser);

    await page.goto(path);
    await waitForContent(page);
    await expectAccessible(page, path);
  });

  test('detalle de un equipo', async ({ page, browser }) => {
    const path = await createAssetPath(browser);

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
