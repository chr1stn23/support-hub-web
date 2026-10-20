import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Espera a que la pantalla termine de cargar: sin esqueletos ni regiones ocupadas. */
export async function waitForContent(page: Page): Promise<void> {
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[aria-label^="Cargando"]')).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

/** WCAG 2.1 A y AA. Si falla, el mensaje dice qué regla, cuántos elementos y cuál es el primero. */
export async function expectAccessible(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const report = results.violations
    .map(
      (violation) =>
        `• ${violation.id} (${violation.impact}): ${violation.help}\n` +
        `    ${violation.nodes.length} elemento(s). El primero: ${violation.nodes[0]?.target.join(' ')}\n` +
        `    ${violation.helpUrl}`,
    )
    .join('\n');
  expect(results.violations, `Problemas de accesibilidad en ${where}:\n${report}`).toEqual([]);
}
