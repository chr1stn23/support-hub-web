import type { Browser, BrowserContext, Page } from '@playwright/test';

import { ACCOUNTS, RoleKey } from './accounts';
import { BASE_URL } from './env';
import { trackErrors } from './errors';

export interface Session {
  readonly context: BrowserContext;
  readonly page: Page;
  /** Excepciones y console.error que ha dado la página hasta ahora. */
  readonly errors: string[];
}

/** Una sesión ya iniciada como ese rol, en su propio contexto: así dos personas usan la aplicación a la vez. */
export async function openSession(browser: Browser, role: RoleKey): Promise<Session> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: ACCOUNTS[role].statePath,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
  });
  const page = await context.newPage();
  return { context, page, errors: trackErrors(page) };
}
