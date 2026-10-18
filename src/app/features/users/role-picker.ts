import { ChangeDetectionStrategy, Component, booleanAttribute, input, model } from '@angular/core';

import type { Role } from '@core/api/models';
import { ROLE_LABEL, ROLE_ORDER } from '@shared/domain';
import { Icon } from '@shared/ui';

const DESCRIPTION: Record<Role, string> = {
  ADMIN: 'Administra usuarios, ve la auditoría y puede hacer todo lo demás.',
  AGENT: 'Atiende tickets y consulta el inventario.',
  ASSET_MANAGER: 'Registra equipos y los asigna.',
  USER: 'Crea tickets y consulta sus propios equipos.',
};

let nextPickerId = 0;

/** Los roles como casillas nativas. Uso: [(selected)]="roles". Siempre entrega los roles ordenados por influencia. */
@Component({
  selector: 'app-role-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="roles" [attr.aria-describedby]="error() ? errorId : null">
      <legend class="legend">
        {{ label() }}
        @if (required()) {
          <span class="required" aria-hidden="true">*</span>
        }
      </legend>

      @for (role of roles; track role) {
        <label class="role" [class.is-selected]="has(role)" [class.is-locked]="isLocked(role)">
          <input
            type="checkbox"
            [checked]="has(role)"
            [disabled]="isLocked(role)"
            (change)="toggle(role, $any($event.target).checked)"
          />
          <span class="role__text">
            <span class="role__name">{{ labels[role] }}</span>
            <span class="role__description">{{ descriptions[role] }}</span>
          </span>
        </label>
      }

      @if (lockedRoles().length > 0 && lockedHint(); as hint) {
        <p class="hint">{{ hint }}</p>
      }
      @if (error(); as message) {
        <p class="error" role="alert" [id]="errorId">
          <app-icon name="alert-triangle" [size]="14" />
          {{ message }}
        </p>
      }
    </fieldset>
  `,
  styles: `
    .roles {
      display: grid;
      gap: var(--space-2);
      padding: 0;
      margin: 0;
      border: 0;
    }
    .legend {
      padding: 0;
      margin-bottom: var(--space-1);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }
    .required {
      margin-left: 2px;
      color: var(--color-danger);
    }
    .role {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3);
      cursor: pointer;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .role:hover {
      background: var(--color-bg-subtle);
    }
    .role.is-selected {
      background: var(--color-bg-selected);
      border-color: var(--color-accent);
    }
    .role.is-locked {
      cursor: not-allowed;
      opacity: 0.8;
    }
    .role input {
      flex-shrink: 0;
      margin: 0.2rem 0 0;
      accent-color: var(--color-accent);
    }
    .role__text {
      display: grid;
      gap: 2px;
    }
    .role__name {
      font-weight: var(--weight-medium);
    }
    .role__description,
    .hint {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .error {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: var(--color-danger);
    }
  `,
})
export class RolePicker {
  readonly label = input('Roles');
  readonly required = input(false, { transform: booleanAttribute });
  readonly error = input<string | null>(null);
  /** Roles que no se pueden cambiar (conservan su estado actual). */
  readonly lockedRoles = input<readonly Role[]>([]);
  readonly lockedHint = input<string | null>(null);
  readonly selected = model<readonly Role[]>([]);

  protected readonly roles = ROLE_ORDER;
  protected readonly labels = ROLE_LABEL;
  protected readonly descriptions = DESCRIPTION;
  protected readonly errorId = `role-picker-${nextPickerId++}-error`;

  protected has(role: Role): boolean {
    return this.selected().includes(role);
  }

  protected isLocked(role: Role): boolean {
    return this.lockedRoles().includes(role);
  }

  protected toggle(role: Role, checked: boolean): void {
    this.selected.set(ROLE_ORDER.filter((r) => (r === role ? checked : this.has(r))));
  }
}
