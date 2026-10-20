import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './e2e/support/env';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.e2e.ts', '**/auth.setup.ts'],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Inicia sesión una vez por rol y guarda las cookies: las demás pruebas parten de ahí
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
    },
  ],
});
