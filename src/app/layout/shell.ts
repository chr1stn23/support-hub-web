import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserMenu } from './user-menu';
import { Button, Icon } from '@shared/ui';
import { AuthService } from '@core/auth/auth.service';
import { UnreadNotifications } from '@core/notifications/unread-notifications.service';
import { navGroupsFor, pathOf } from './nav-items';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Button, Icon, UserMenu],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeNav()' },
})
export class Shell implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(UnreadNotifications);

  readonly navOpen = signal(false);
  protected readonly groups = computed(() => navGroupsFor(this.auth.roles()));

  protected readonly unread = this.notifications.count;
  protected readonly unreadText = computed(() =>
    this.unread() > 99 ? '99+' : String(this.unread()),
  );
  protected readonly bellLabel = computed(() =>
    this.unread() > 0 ? `Notificaciones, ${this.unread()} sin leer` : 'Notificaciones',
  );

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private lastPath: string | null = null;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const path = pathOf(event.urlAfterRedirects);
        if (this.lastPath !== null && path !== this.lastPath) {
          this.focusMain();
        }
        this.lastPath = path;
        this.closeNav();
      });
  }

  ngOnInit(): void {
    this.notifications.start();
  }

  ngOnDestroy(): void {
    this.notifications.stop();
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.focusMain();
  }

  private focusMain(): void {
    this.main().nativeElement.focus({ preventScroll: true });
  }
}
