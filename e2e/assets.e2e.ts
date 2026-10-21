import { expect, test } from '@playwright/test';

import { openSession } from './support/session';

test('un equipo se registra, se asigna, lo ve su responsable, reporta un problema y se da de baja', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const model = `Equipo-${stamp}`;
  const manager = await openSession(browser, 'assets');
  const user = await openSession(browser, 'user');

  try {
    // 1. El gestor registra un equipo nuevo
    await manager.page.goto('/activos');
    await manager.page.getByRole('button', { name: 'Nuevo equipo' }).click();
    const form = manager.page.getByRole('dialog', { name: 'Nuevo equipo' });
    await form.getByLabel('Tipo').selectOption({ index: 1 });
    await form.getByLabel('Marca').fill('E2E');
    await form.getByLabel('Modelo').fill(model);
    await form.getByLabel('Número de serie').fill(`SN-${stamp}`);
    await form.getByRole('button', { name: 'Registrar equipo' }).click();

    await expect(manager.page).toHaveURL(/\/activos\/[0-9a-f-]{36}$/);
    await expect(
      manager.page.getByRole('heading', { level: 1, name: `E2E ${model}` }),
    ).toBeVisible();

    // 2. Lo asigna, buscando a la persona
    await manager.page.getByRole('button', { name: 'Asignar', exact: true }).click();
    const assign = manager.page.getByRole('dialog', { name: 'Asignar equipo' });
    await assign.getByRole('searchbox', { name: 'Buscar personas' }).fill('user@supporthub');
    await assign.getByRole('radio', { name: /user@supporthub\.local/ }).check();
    await assign.getByRole('button', { name: 'Asignar', exact: true }).click();
    await expect(manager.page.getByText('Asignado').first()).toBeVisible();

    // 3. La persona lo ve en "Mis equipos"
    await user.page.goto('/mis-equipos');
    const card = user.page.locator('li.card', { hasText: model });
    await expect(card).toBeVisible();

    // 4. Reporta un problema: el ticket nuevo ya trae el equipo elegido
    await card.getByRole('link', { name: 'Reportar un problema' }).click();
    await expect(user.page).toHaveURL(/\/tickets\/nuevo\?equipo=/);
    await expect(
      user.page.getByLabel('Equipo relacionado').locator('option:checked'),
    ).toContainText(model);

    // 5. Y salir sin escribir nada NO pregunta: lo elegido por la aplicación no cuenta como cambio sin guardar
    await user.page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Resumen' })
      .click();
    await expect(user.page).toHaveURL(/\/resumen/);

    // 6. El gestor registra la devolución...
    await manager.page.getByRole('button', { name: 'Registrar devolución' }).click();
    await manager.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Registrar devolución' })
      .click();
    await expect(manager.page.getByRole('button', { name: 'Asignar', exact: true })).toBeVisible();

    // 7. ... y lo da de baja: ya no ofrece ninguna acción de estado
    await manager.page.getByRole('button', { name: 'Cambiar estado' }).click();
    const status = manager.page.getByRole('dialog', { name: 'Cambiar estado' });
    await status.getByRole('radio', { name: /Dar de baja/ }).check();
    await status.getByRole('button', { name: 'Confirmar' }).click();
    await expect(manager.page.getByRole('button', { name: 'Cambiar estado' })).toHaveCount(0);
    await expect(manager.page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
    expect(manager.errors, 'errores en la ventana del gestor').toEqual([]);
    expect(user.errors, 'errores en la ventana de la persona usuaria').toEqual([]);
  } finally {
    await manager.context.close();
    await user.context.close();
  }
});
