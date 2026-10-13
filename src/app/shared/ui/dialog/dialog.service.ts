import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { inject, Service } from '@angular/core';
import { ConfirmDialog, ConfirmOptions } from './confirm-dialog';
import { firstValueFrom } from 'rxjs';

export interface DialogOptions<D = unknown> {
  readonly data?: D;
  /** Nombre accesible del diálogo (lo que leerá un lector de pantalla al abrirse). */
  readonly ariaLabel: string;
  readonly width?: string;
  readonly role?: 'dialog' | 'alertdialog';
  /** Con true, ni Escape ni el clic en el fondo lo cierran. */
  readonly disableClose?: boolean;
}

@Service()
export class DialogService {
  private readonly cdkDialog = inject(Dialog);

  /** Abre un componente como diálogo modal. Dentro de él: inject(DIALOG_DATA) y inject(DialogRef). */
  open<C, R = unknown, D = unknown>(
    component: ComponentType<C>,
    options: DialogOptions<D>,
  ): DialogRef<R, C> {
    return this.cdkDialog.open<R, D, C>(component, {
      data: options.data,
      ariaLabel: options.ariaLabel,
      role: options.role ?? 'dialog',
      width: options.width ?? 'min(30rem, calc(100vw - 2rem))',
      disableClose: options.disableClose ?? false,
      autoFocus: 'first-tabbable',
      restoreFocus: true, // al cerrar, el foco vuelve al botón que lo abrió
      panelClass: 'app-dialog-panel',
      backdropClass: 'app-dialog-backdrop',
    });
  }

  /** Pregunta y espera: true si la persona confirma; false si cancela, pulsa Escape o hace clic fuera. */
  confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.open<ConfirmDialog, boolean, ConfirmOptions>(ConfirmDialog, {
      data: options,
      ariaLabel: options.title,
      role: 'alertdialog',
    });
    return firstValueFrom(ref.closed, { defaultValue: undefined }).then(
      (result) => result === true,
    );
  }
}
