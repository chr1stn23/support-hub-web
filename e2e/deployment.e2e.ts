import { expect, test } from '@playwright/test';

import { waitForContent } from './support/a11y';
import { ACCOUNTS, NO_SESSION } from './support/accounts';
import { trackErrors } from './support/errors';

// Solo contra el contenedor: el servidor de desarrollo no lleva estas cabeceras ni esta caché
test.skip(!process.env['E2E_DEPLOYED'], 'Solo contra el contenedor (define E2E_DEPLOYED=1)');

test.describe('sin sesión', () => {
  test.use({ storageState: NO_SESSION });

  test('la aplicación lleva las cabeceras de seguridad y no se guarda en caché', async ({
    request,
  }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['cache-control']).toBe('no-cache');
    expect(headers['server']).not.toMatch(/\d/); // sin el número de versión de nginx
  });

  test('los archivos con huella se guardan un año, sin revalidar', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const script = /<script[^>]+src="([^"]+\.js)"/.exec(html)?.[1];
    expect(script, 'no se encontró ningún <script> en index.html').toBeTruthy();

    const response = await request.get(`/${script!.replace(/^\//, '')}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(response.headers()['content-type']).toContain('javascript');
  });

  test('la dirección de una pantalla entrega la aplicación (las rutas son del navegador)', async ({
    request,
  }) => {
    const response = await request.get('/tickets/abc?x=1');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('<app-root');
  });

  test('un archivo que no existe da 404, no la aplicación', async ({ request }) => {
    const response = await request.get('/main-no-existe.js');
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain('<app-root');
  });

  test('los archivos ocultos no se sirven', async ({ request }) => {
    for (const path of ['/.env', '/.git/config']) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test('el estado del servidor responde', async ({ request }) => {
    const response = await request.get('/healthz');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('ok');
  });

  test('cargar el inicio de sesión no viola la política de contenido', async ({ page }) => {
    const errors = trackErrors(page); // una violación de la CSP se registra como console.error
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('con sesión', () => {
  test.use({ storageState: ACCOUNTS.user.statePath });

  test('la aplicación carga entera sin violar la política de contenido', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/resumen');
    await waitForContent(page);
    expect(errors).toEqual([]);
  });

  test('la API conserva sus propias cabeceras, sin que nginx las duplique', async ({ page }) => {
    await page.goto('/resumen');
    const response = await page.request.get('/api/v1/auth/me');
    expect(response.status()).toBe(200);
    expect(response.headers()['x-content-type-options']).toBe('nosniff'); // duplicada saldría "nosniff, nosniff"
  });

  test('una subida de 5 MB llega al backend; una de 8 MB la corta nginx', async ({ page }) => {
    await page.goto('/resumen');
    const xsrf = (await page.context().cookies()).find(
      (cookie) => cookie.name === 'XSRF-TOKEN',
    )?.value;
    expect(xsrf).toBeTruthy();
    const upload = (megabytes: number) =>
      page.request.post('/api/v1/tickets/00000000-0000-0000-0000-000000000000/attachments', {
        headers: { 'X-XSRF-TOKEN': xsrf! },
        multipart: {
          file: {
            name: 'grande.txt',
            mimeType: 'text/plain',
            buffer: Buffer.alloc(megabytes * 1024 * 1024, 'a'),
          },
        },
      });

    // Con el límite por defecto de nginx (1 MB) esto daría 413. El ticket no existe, así que el backend responde otra cosa
    expect((await upload(5)).status()).not.toBe(413);
    expect((await upload(8)).status()).toBe(413);
  });
});
