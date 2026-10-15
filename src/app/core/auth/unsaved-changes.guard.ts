import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { DialogService } from '@shared/ui';

/** Una pantalla con un formulario que se puede perder. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Antes de salir de una pantalla con cambios sin guardar, pregunta. Sin cambios, deja pasar. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  return inject(DialogService).confirm({
    title: 'Salir sin guardar',
    message: 'Tienes cambios sin guardar. Si sales ahora, se perderán.',
    confirmLabel: 'Salir sin guardar',
    cancelLabel: 'Seguir editando',
    destructive: true,
  });
};
