import { expect, test } from '@playwright/test';

import { openSession } from './support/session';

test('un ticket recorre su ciclo entre dos personas: se crea, se toma, se comenta y se resuelve', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const title = `E2E ${Date.now()}`;
  const user = await openSession(browser, 'user');
  const agent = await openSession(browser, 'agent');

  try {
    // 1. La persona usuaria crea el ticket
    await user.page.goto('/tickets/nuevo');
    await user.page.getByLabel('Asunto').fill(title);
    await user.page.getByLabel('Categoría').selectOption({ index: 1 });
    await user.page.getByLabel('Descripción').fill('Ticket de una prueba de extremo a extremo.');
    await user.page.getByRole('button', { name: 'Crear ticket' }).click();

    await expect(user.page).toHaveURL(/\/tickets\/[0-9a-f-]{36}$/);
    await expect(user.page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    const ticketUrl = user.page.url();

    // 2. Un agente lo toma
    await agent.page.goto(ticketUrl);
    await agent.page.getByRole('button', { name: 'Tomar ticket' }).click();
    await expect(agent.page.getByText('En curso').first()).toBeVisible();

    // 3. Y lo comenta
    await agent.page.getByLabel('Agregar un comentario').fill('Lo estoy revisando.');
    await agent.page.getByRole('button', { name: 'Comentar' }).click();
    await expect(agent.page.getByText('Lo estoy revisando.')).toBeVisible();

    // 4. Y lo resuelve, con una nota
    await agent.page.getByRole('button', { name: 'Cambiar estado' }).click();
    const dialog = agent.page.getByRole('dialog', { name: 'Cambiar estado' });
    await dialog.getByRole('radio', { name: /Marcar como resuelto/ }).check();
    await dialog.getByLabel('Nota').fill('Se reinició el equipo.');
    await dialog.getByRole('button', { name: 'Confirmar' }).click();
    await expect(agent.page.getByText('Resuelto').first()).toBeVisible();

    // 5. La persona usuaria lo ve, y su campana le avisa
    await user.page.reload();
    await expect(user.page.getByText('Lo estoy revisando.')).toBeVisible();
    await expect(user.page.getByText('Resuelto').first()).toBeVisible();
    await expect(
      user.page.getByRole('link', { name: /Notificaciones, \d+ sin leer/ }),
    ).toBeVisible();
    expect(user.errors, 'errores en la ventana de la persona usuaria').toEqual([]);
    expect(agent.errors, 'errores en la ventana del agente').toEqual([]);
  } finally {
    await user.context.close();
    await agent.context.close();
  }
});
