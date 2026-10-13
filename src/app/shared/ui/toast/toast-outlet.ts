import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Tone } from '../chip/chip';
import { IconName } from '../icon/icons';
import { ToastKind, ToastService } from './toast.service';
import { Icon } from '../icon/icon';

const TONE: Record<ToastKind, Tone> = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'accent',
};

const ICON: Record<ToastKind, IconName> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
};

@Component({
  selector: 'app-toast-outlet',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="stack"
      aria-live="polite"
      (mouseenter)="service.pause()"
      (mouseleave)="service.resume()"
      (focusin)="service.pause()"
      (focusout)="service.resume()"
    >
      @for (toast of service.toasts(); track toast.id) {
        <div
          [class]="'toast tone-' + tone(toast.kind)"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
        >
          <app-icon class="toast__icon" [name]="icon(toast.kind)" [size]="18" />
          <p class="toast__message">{{ toast.message }}</p>
          <button
            type="button"
            class="toast__close"
            aria-label="Cerrar aviso"
            (click)="service.dismiss(toast.id)"
          >
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      right: var(--space-4);
      bottom: var(--space-4);
      z-index: var(--z-toast);
      display: grid;
      gap: var(--space-2);
      width: min(24rem, calc(100vw - 2rem));
      pointer-events: none;
    }
    .toast {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: start;
      gap: var(--space-2);
      padding: var(--space-3);
      color: var(--color-text);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-left: 3px solid var(--tone-fg);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-popover);
      pointer-events: auto;
      animation: toast-in var(--dur-base) var(--ease-out);
    }
    .toast__icon {
      margin-top: 1px;
      color: var(--tone-fg);
    }
    .toast__message {
      font-size: var(--text-sm);
      line-height: var(--leading-normal);
    }
    .toast__close {
      display: grid;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      color: var(--color-text-secondary);
      background: transparent;
      border: 0;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .toast__close:hover {
      color: var(--color-text);
      background: var(--color-bg-hover);
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  `,
})
export class ToastOutlet {
  protected readonly service = inject(ToastService);

  protected tone(kind: ToastKind): Tone {
    return TONE[kind];
  }

  protected icon(kind: ToastKind): IconName {
    return ICON[kind];
  }
}
