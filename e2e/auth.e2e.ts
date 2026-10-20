import { expect, test } from '@playwright/test';

import { ACCOUNTS, NO_SESSION } from './support/accounts';
import { PASSWORD } from './support/env';

// Estas pruebas empiezan SIN sesión
test.use({ storageState: NO_SESSION });

async function signIn(page: import('@playwright/test').Page, email: string, password = PASSWORD) {
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('entra con una cuenta válida y llega al resumen', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, ACCOUNTS.agent.email);

  await expect(page).toHaveURL(/\/resumen/);
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
});

test('una contraseña equivocada no revela si el correo existe, y no conserva lo escrito', async ({
  page,
}) => {
  await page.goto('/login');
  // Un correo que no existe y único en cada ejecución: no cuenta contra el límite de intentos de las cuentas reales
  await signIn(page, `nadie+${Date.now()}@supporthub.local`, 'Equivocada1');

  await expect(
    page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel('Contraseña')).toHaveValue('');
});

test('una página protegida lleva al login y, tras entrar, de vuelta a ella', async ({ page }) => {
  await page.goto('/tickets');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Ftickets/);

  await signIn(page, ACCOUNTS.agent.email);
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tickets' })).toBeVisible();
});

test('un returnUrl que apunta a otro sitio no saca a nadie de la aplicación', async ({ page }) => {
  await page.goto('/login?returnUrl=//sitio-malo.example.com');
  await signIn(page, ACCOUNTS.agent.email);

  await expect(page).toHaveURL(/\/resumen/);
  expect(new URL(page.url()).hostname).not.toContain('sitio-malo');
});

test('cierra la sesión y vuelve al login', async ({ page }) => {
  // Con su propia sesión: cerrar la de las cuentas guardadas las dejaría inservibles para las demás pruebas
  await page.goto('/login');
  await signIn(page, ACCOUNTS.user.email);
  await expect(page).toHaveURL(/\/resumen/);

  await page.locator('app-user-menu button').click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

  await expect(page).toHaveURL(/\/login/);
  await page.goto('/tickets');
  await expect(page).toHaveURL(/\/login\?returnUrl/);
});
