import { expect, test as setup } from '@playwright/test';

import { ACCOUNTS } from './support/accounts';
import { PASSWORD } from './support/env';

for (const [role, account] of Object.entries(ACCOUNTS)) {
  setup(`inicia sesión como ${role}`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill(account.email);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/resumen/);
    await page.context().storageState({ path: account.statePath });
  });
}
