import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { describeError } from '@core/api/error-messages';
import type { AppNotification } from '@core/api/models';
import { NotificationsApi } from '@core/api/notifications.api';
import { ACCESS } from '@core/auth/access';
import { AuthService } from '@core/auth/auth.service';
import { loadable } from '@core/http/loadable';
import { UnreadNotifications } from '@core/notifications/unread-notifications.service';
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  Skeleton,
  Time,
  ToastService,
} from '@shared/ui';
import {
  NOTIFICATION_SIZE_OPTIONS,
  NOTIFICATION_VIEWS,
  NotificationListState,
  NotificationView,
  RawNotificationParams,
  notificationIcon,
  notificationLink,
  parseNotificationState,
  toNotificationApiQuery,
  toNotificationUrlParams,
} from './notification-query';

@Component({
  selector: 'app-notifications-page',
  imports: [
    RouterLink,
    PageHeader,
    Button,
    EmptyState,
    ErrorState,
    Icon,
    Pagination,
    Skeleton,
    Time,
  ],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  readonly vista = input<string>();
  readonly pagina = input<string>();
  readonly tamano = input<string>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(NotificationsApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly unread = inject(UnreadNotifications).count;
  private readonly counter = inject(UnreadNotifications);

  protected readonly views = NOTIFICATION_VIEWS;
  protected readonly sizeOptions = NOTIFICATION_SIZE_OPTIONS;
  protected readonly canSeeInventory = computed(() => this.auth.hasAnyRole([...ACCESS.inventory]));

  protected readonly state = computed<NotificationListState>(() => {
    const raw: RawNotificationParams = {
      vista: this.vista(),
      pagina: this.pagina(),
      tamano: this.tamano(),
    };
    return parseNotificationState(raw);
  });

  protected readonly list = loadable(
    () => toNotificationApiQuery(this.state()),
    (query) => this.api.list(query),
  );
  protected readonly page = this.list.value;
  protected readonly loading = computed(() => this.list.state().status === 'loading');
  protected readonly error = computed(() => {
    const state = this.list.state();
    return state.status === 'error' ? state.error : null;
  });
  protected readonly announcement = computed(() => {
    const data = this.page();
    return data && !this.loading() ? `${data.totalElements} notificaciones` : '';
  });

  /** Las que se acaban de marcar aquí: se ven como leídas sin esperar a recargar la lista. */
  private readonly locallyRead = signal<ReadonlySet<string>>(new Set());
  private readonly pending = signal<ReadonlySet<string>>(new Set());
  protected readonly markingAll = signal(false);

  protected isUnread(notification: AppNotification): boolean {
    return !notification.read && !this.locallyRead().has(notification.id);
  }

  protected linkFor(notification: AppNotification): string[] | null {
    return notificationLink(notification, this.canSeeInventory());
  }

  protected iconFor(notification: AppNotification) {
    return notificationIcon(notification.type);
  }

  protected tabParams(view: NotificationView): Record<string, string> {
    return toNotificationUrlParams({ ...this.state(), view, page: 0 });
  }

  protected onPage(page: number): void {
    this.navigate({ page });
  }

  protected onSize(size: number): void {
    this.navigate({ size, page: 0 });
  }

  protected firstPage(): void {
    this.navigate({ page: 0 });
  }

  protected reload(): void {
    this.locallyRead.set(new Set());
    this.list.reload();
    void this.counter.refresh();
  }

  /** Abrir una notificación la marca como leída. No bloquea la navegación ni avisa si falla. */
  protected open(notification: AppNotification): void {
    if (this.isUnread(notification)) {
      void this.markRead(notification, false);
    }
  }

  protected markOne(notification: AppNotification): Promise<void> {
    return this.markRead(notification, true);
  }

  protected async markAll(): Promise<void> {
    if (this.markingAll()) return;
    this.markingAll.set(true);
    try {
      await firstValueFrom(this.api.markAllRead());
      this.counter.set(0);
      this.locallyRead.set(new Set());
      this.list.reload();
      this.toast.success('Marcaste todas las notificaciones como leídas.');
    } catch (error) {
      this.toast.error(describeError(error));
    } finally {
      this.markingAll.set(false);
    }
  }

  private async markRead(notification: AppNotification, announceFailure: boolean): Promise<void> {
    if (this.pending().has(notification.id)) return;
    this.update(this.pending, notification.id, true);
    this.update(this.locallyRead, notification.id, true); // se ve como leída ya, sin esperar al servidor
    try {
      await firstValueFrom(this.api.markRead(notification.id));
    } catch (error) {
      this.update(this.locallyRead, notification.id, false); // el servidor no lo registró: vuelve a ser no leída
      if (announceFailure) {
        this.toast.error(describeError(error));
      }
    } finally {
      this.update(this.pending, notification.id, false);
      void this.counter.refresh(); // el número de la campana lo decide el servidor
    }
  }

  private update(
    target: ReturnType<typeof signal<ReadonlySet<string>>>,
    id: string,
    on: boolean,
  ): void {
    target.update((ids) => {
      const next = new Set(ids);
      if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  private navigate(patch: Partial<NotificationListState>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toNotificationUrlParams({ ...this.state(), ...patch }),
    });
  }
}
