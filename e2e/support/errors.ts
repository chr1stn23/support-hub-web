import type { Page } from '@playwright/test';

/**
 * Recoge las excepciones sin capturar y los console.error de la página. Los fallos de carga de recursos
 * ("Failed to load resource…", un 401 o un 403 esperados de la API) se ignoran: de eso se encarga cada prueba.
 */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`Excepción: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.startsWith('Failed to load resource')) return;
    errors.push(`console.error: ${text}`);
  });
  return errors;
}
