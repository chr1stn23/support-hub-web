import { expect, test } from '@playwright/test';

import { ACCOUNTS, RoleKey } from './support/accounts';

const MENU: Record<RoleKey, string[]> = {
  user: ['Resumen', 'Tickets', 'Mis equipos'],
  agent: ['Resumen', 'Tickets', 'Mis equipos', 'Inventario'],
  assets: ['Resumen', 'Tickets', 'Mis equipos', 'Inventario'],
  admin: ['Resumen', 'Tickets', 'Mis equipos', 'Inventario', 'Usuarios', 'Auditoría'],
};

for (const role of Object.keys(MENU) as RoleKey[]) {
  test.describe(`rol ${role}`, () => {
    test.use({ storageState: ACCOUNTS[role].statePath });

    test('ve en el menú solo lo que le corresponde', async ({ page }) => {
      await page.goto('/resumen');
      const links = page.getByRole('navigation', { name: 'Principal' }).getByRole('link');
      await expect(links).toHaveText(MENU[role]);
    });
  });
}

test.describe('lo que no le corresponde', () => {
  test.describe('una persona usuaria', () => {
    test.use({ storageState: ACCOUNTS.user.statePath });

    test('no entra a la administración ni al inventario, aunque escriba la dirección', async ({
      page,
    }) => {
      for (const path of ['/usuarios', '/auditoria', '/activos']) {
        await page.goto(path);
        await expect(page).toHaveURL(/\/acceso-denegado/);
        await expect(page.getByText('No tienes acceso a esta sección')).toBeVisible();
      }
    });
  });

  test.describe('un agente', () => {
    test.use({ storageState: ACCOUNTS.agent.statePath });

    test('ve el inventario, pero no administra usuarios', async ({ page }) => {
      await page.goto('/activos');
      await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Nuevo equipo' })).toHaveCount(0);

      await page.goto('/usuarios');
      await expect(page).toHaveURL(/\/acceso-denegado/);
    });
  });

  test.describe('un administrador', () => {
    test.use({ storageState: ACCOUNTS.admin.statePath });

    test('llega a usuarios y auditoría', async ({ page }) => {
      await page.goto('/usuarios');
      await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible();
      await page.goto('/auditoria');
      await expect(page.getByRole('heading', { level: 1, name: 'Auditoría' })).toBeVisible();
    });
  });

  test.describe('cualquier rol', () => {
    test.use({ storageState: ACCOUNTS.user.statePath });

    test('una dirección que no existe da "No encontramos esta página", dentro del marco', async ({
      page,
    }) => {
      await page.goto('/esta-ruta-no-existe');
      await expect(page.getByText('No encontramos esta página')).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    });
  });
});
