import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Marco visual de un diálogo. Contenido por defecto = cuerpo.
 * Un elemento con el atributo "dialogFooter" va al pie (acciones).
 */
@Component({
  selector: 'app-dialog-frame',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <h2 class="title">{{ title() }}</h2>
      @if (closable()) {
        <button type="button" class="close" aria-label="Cerrar" (click)="closed.emit()">
          <app-icon name="x" [size]="16" />
        </button>
      }
    </header>
    <div class="body"><ng-content /></div>
    <footer class="foot"><ng-content select="[dialogFooter]" /></footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 4rem);
      color: var(--color-text);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-dialog);
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5) var(--space-3);
    }
    .title {
      font-size: var(--text-xl);
    }
    .close {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      color: var(--color-text-secondary);
      background: transparent;
      border: 0;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .close:hover {
      color: var(--color-text);
      background: var(--color-bg-hover);
    }
    .body {
      padding: 0 var(--space-5) var(--space-4);
      overflow-y: auto;
    }
    .foot {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5) var(--space-4);
      border-top: 1px solid var(--color-border);
    }
    .foot:not(:has(*)) {
      display: none;
    }
  `,
})
export class DialogFrame {
  readonly title = input.required<string>();
  readonly closable = input(true, { transform: booleanAttribute });
  readonly closed = output<void>();
}
