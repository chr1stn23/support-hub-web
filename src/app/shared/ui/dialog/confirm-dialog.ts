import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogFrame } from './dialog-frame';
import { Button } from '../button/button';

export interface ConfirmOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** Acción que no se puede deshacer: el botón de confirmar sale en rojo. */
  readonly destructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [DialogFrame, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame [title]="data.title" [closable]="false">
      <p class="message">{{ data.message }}</p>
      <div dialogFooter class="actions">
        <button appButton (click)="ref.close(false)">{{ data.cancelLabel ?? 'Cancelar' }}</button>
        <button
          appButton
          [variant]="data.destructive ? 'danger' : 'primary'"
          (click)="ref.close(true)"
        >
          {{ data.confirmLabel ?? 'Confirmar' }}
        </button>
      </div>
    </app-dialog-frame>
  `,
  styles: `
    .message {
      color: var(--color-text-secondary);
      line-height: var(--leading-relaxed);
    }
    .actions {
      display: contents;
    }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}
