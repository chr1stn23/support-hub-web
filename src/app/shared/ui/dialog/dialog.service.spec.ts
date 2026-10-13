import { TestBed } from '@angular/core/testing';
import { DialogService } from './dialog.service';
import { Dialog } from '@angular/cdk/dialog';
import { ApplicationRef } from '@angular/core';

describe('DialogService.confirm', () => {
  let service: DialogService;

  beforeEach(() => {
    service = TestBed.inject(DialogService);
  });

  afterEach(() => TestBed.inject(Dialog).closeAll());

  /** El diálogo se pinta en un contenedor aparte: hay que dejar que Angular lo renderice. */
  const render = async () => {
    TestBed.inject(ApplicationRef).tick();
    await new Promise<void>((resolve) => setTimeout(resolve));
    TestBed.inject(ApplicationRef).tick();
  };

  const dialog = () => document.querySelector<HTMLElement>('app-confirm-dialog')!;
  const button = (label: string) =>
    Array.from(dialog().querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === label,
    )!;

  const options = {
    title: 'Resolver ticket',
    message: '¿Pasar el ticket a «Resuelto»?',
    confirmLabel: 'Resolver',
  };

  it('opens as an accessible alert dialog with its title and message', async () => {
    const answer = service.confirm(options);
    await render();

    const root = document.querySelector('[role="alertdialog"]');
    expect(root?.getAttribute('aria-label')).toBe('Resolver ticket');
    expect(dialog().textContent).toContain('Resolver ticket');
    expect(dialog().textContent).toContain('¿Pasar el ticket a «Resuelto»?');

    button('Cancelar').click();
    await answer;
  });

  it('resolves true when the person confirms', async () => {
    const answer = service.confirm(options);
    await render();

    button('Resolver').click();
    await expect(answer).resolves.toBe(true);
  });

  it('resolves false when the person cancels', async () => {
    const answer = service.confirm(options);
    await render();

    button('Cancelar').click();
    await expect(answer).resolves.toBe(false);
  });

  it('resolves false on Escape', async () => {
    const answer = service.confirm(options);
    await render();

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    await expect(answer).resolves.toBe(false);
  });

  it('uses the custom labels, and a red button for destructive actions', async () => {
    const answer = service.confirm({
      title: 'Eliminar adjunto',
      message: 'No se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Conservar',
      destructive: true,
    });
    await render();

    expect(button('Conservar')).toBeTruthy();
    expect(button('Eliminar').classList).toContain('btn--danger');

    button('Conservar').click();
    await answer;
  });

  it('removes the dialog from the page once closed', async () => {
    const answer = service.confirm(options);
    await render();
    button('Cancelar').click();
    await answer;
    await render();

    expect(document.querySelector('app-confirm-dialog')).toBeNull();
  });
});
