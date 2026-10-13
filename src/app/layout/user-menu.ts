import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { sortedRoleLabels } from '@shared/domain';
import { Avatar, Icon } from '@shared/ui';

@Component({
  selector: 'app-user-menu',
  imports: [CdkMenuTrigger, CdkMenu, CdkMenuItem, Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="trigger"
      [cdkMenuTriggerFor]="menu"
      [attr.aria-label]="'Menú de ' + name()"
      [attr.title]="allRoles()"
    >
      <app-avatar [name]="name()" />
      <span class="who">
        <span class="who__name">{{ name() }}</span>
        <span class="who__role">{{ roleLabel() }}</span>
      </span>
      <app-icon name="chevron-down" [size]="14" />
    </button>

    <ng-template #menu>
      <div class="menu" cdkMenu>
        <button type="button" class="menu__item" cdkMenuItem (cdkMenuItemTriggered)="signOut()">
          <app-icon name="log-out" [size]="16" />
          Cerrar sesión
        </button>
      </div>
    </ng-template>
  `,
  styles: `
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-2) var(--space-1) var(--space-1);
      color: var(--color-text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .trigger:hover {
      background: var(--color-bg-hover);
    }
    .who {
      display: grid;
      text-align: left;
      line-height: 1.25;
    }
    .who__name {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }
    .who__role {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
    @media (max-width: 40rem) {
      .who {
        display: none;
      }
    }

    .menu {
      min-width: 12rem;
      padding: var(--space-1);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-popover);
    }
    .menu__item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      font-size: var(--text-md);
      color: var(--color-text);
      text-align: left;
      background: transparent;
      border: 0;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .menu__item:hover,
    .menu__item:focus-visible {
      background: var(--color-bg-hover);
    }
  `,
})
export class UserMenu {
  private readonly auth = inject(AuthService);

  protected readonly name = computed(() => this.auth.user()?.fullName ?? '');
  private readonly labels = computed(() => sortedRoleLabels(this.auth.roles()));
  /** El rol principal, a la vista. */
  protected readonly roleLabel = computed(() => this.labels()[0] ?? '');
  protected readonly allRoles = computed(() => this.labels().join(' · '));

  protected signOut(): void {
    this.auth.logout();
  }
}
