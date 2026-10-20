import { expect, test } from '@playwright/test';

import { ACCOUNTS } from './support/accounts';

test.use({ storageState: ACCOUNTS.agent.statePath });

test('las cookies de sesión no se pueden leer desde JavaScript, solo la del CSRF', async ({
  page,
}) => {
  await page.goto('/resumen');
  const visible = await page.evaluate(() => document.cookie);

  expect(visible).toContain('XSRF-TOKEN');
  expect(visible).not.toContain('SH_ACCESS');
  expect(visible).not.toContain('SH_REFRESH');
});

test('no hay ningún token en el almacenamiento del navegador', async ({ page }) => {
  await page.goto('/resumen');
  const keys = await page.evaluate(() => [
    ...Object.keys(localStorage),
    ...Object.keys(sessionStorage),
  ]);
  expect(keys).toEqual([]);
});

test('la sesión por cookies funciona, y una escritura sin el encabezado CSRF se rechaza', async ({
  page,
}) => {
  await page.goto('/resumen');

  const me = await page.request.get('/api/v1/auth/me');
  expect(me.status()).toBe(200);
  expect((await me.json()).email).toBe(ACCOUNTS.agent.email);

  // Una escritura con las cookies pero SIN el encabezado: exactamente lo que haría otra página maliciosa
  const forged = await page.request.post('/api/v1/notifications/read-all');
  expect(forged.status()).toBe(403);

  // La misma escritura con el encabezado que la aplicación sí envía
  const xsrf = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'XSRF-TOKEN',
  )?.value;
  expect(xsrf).toBeTruthy();
  const legitimate = await page.request.post('/api/v1/notifications/read-all', {
    headers: { 'X-XSRF-TOKEN': xsrf! },
  });
  expect(legitimate.status()).toBe(204);
});
