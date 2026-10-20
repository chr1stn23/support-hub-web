import type { Browser, BrowserContext, Page } from '@playwright/test';

import { ACCOUNTS, RoleKey } from './accounts';
import { BASE_URL } from './env';

export interface Session {
  readonly context: BrowserContext;
  readonly page: Page;
}

/** Una sesión ya iniciada como ese rol, en su propio contexto: así dos personas usan la aplicación a la vez. */
export async function openSession(browser: Browser, role: RoleKey): Promise<Session> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: ACCOUNTS[role].statePath,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
  });
  return { context, page: await context.newPage() };
}
