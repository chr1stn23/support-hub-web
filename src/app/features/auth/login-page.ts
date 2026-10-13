import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  isDevMode,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { toApiError } from '../../core/api/api-error';
import { SESSION_NOTICES, describeError } from '../../core/api/error-messages';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/return-url';
import { Button } from '../../shared/ui/button/button';
import { Control } from '../../shared/ui/field/control';
import { Field } from '../../shared/ui/field/field';
import { Icon } from '../../shared/ui/icon/icon';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

/** 214 → "3:34" */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

@Component({
  selector: 'app-login-page',
  imports: [Field, Control, Button, Icon],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Llega de ?returnUrl=... (withComponentInputBinding). */
  readonly returnUrl = input<string>();

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);
  /** Segundos que faltan para poder reintentar tras un bloqueo por demasiados intentos. */
  protected readonly lockedFor = signal(0);

  protected readonly locked = computed(() => this.lockedFor() > 0);
  protected readonly countdown = computed(() => formatCountdown(this.lockedFor()));
  protected readonly notice = computed(() => {
    const notice = this.auth.notice();
    return notice ? SESSION_NOTICES[notice] : null;
  });

  protected readonly emailError = computed(() => {
    if (!this.submitted()) return null;
    const value = this.email().trim();
    if (!value) return 'Ingresa tu correo.';
    return EMAIL_PATTERN.test(value) ? null : 'Ingresa un correo electrónico válido.';
  });
  protected readonly passwordError = computed(() =>
    this.submitted() && !this.password() ? 'Ingresa tu contraseña.' : null,
  );

  /** Cuentas de demostración: solo en compilaciones de desarrollo. */
  protected readonly demoAccounts = isDevMode()
    ? [
        'user@supporthub.local',
        'agent@supporthub.local',
        'assets@supporthub.local',
        'admin@supporthub.local',
      ]
    : [];

  private readonly emailInput = viewChild.required<ElementRef<HTMLInputElement>>('emailInput');
  private readonly passwordInput =
    viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');
  private lockTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    afterNextRender(() => this.emailInput().nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.stopLock();
  }

  protected useDemo(email: string): void {
    this.email.set(email);
    this.password.set('Demo1234!');
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    if (this.emailError() || this.passwordError() || this.locked() || this.busy()) {
      return;
    }

    this.busy.set(true);
    this.serverError.set(null);
    try {
      await firstValueFrom(this.auth.login(this.email().trim(), this.password()));
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      const apiError = toApiError(error);
      this.serverError.set(describeError(error));
      this.password.set(''); // tras un fallo, la contraseña no se conserva
      if (apiError.code === 'TOO_MANY_ATTEMPTS' && apiError.retryAfterSeconds) {
        this.startLock(apiError.retryAfterSeconds);
      } else {
        this.passwordInput().nativeElement.focus();
      }
    } finally {
      this.busy.set(false);
    }
  }

  private startLock(seconds: number): void {
    this.stopLock();
    this.lockedFor.set(Math.ceil(seconds));
    this.lockTimer = setInterval(() => {
      this.lockedFor.update((value) => value - 1);
      if (this.lockedFor() <= 0) {
        this.stopLock();
        this.serverError.set(null);
      }
    }, 1000);
  }

  private stopLock(): void {
    if (this.lockTimer !== null) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
    }
    this.lockedFor.set(0);
  }
}
