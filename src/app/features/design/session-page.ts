import { DatePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { API_BASE } from '@core/api/api-config';
import { toApiError } from '@core/api/api-error';
import { describeError, SESSION_NOTICES } from '@core/api/error-messages';
import { AuthService } from '@core/auth/auth.service';
import { firstValueFrom } from 'rxjs';

interface Probe {
  label: string;
  path: string;
}

@Component({
  selector: 'app-session-page',
  imports: [RouterLink, JsonPipe, DatePipe],
  templateUrl: './session-page.html',
  styleUrl: './session-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionPage {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** Llega de ?returnUrl=... gracias a withComponentInputBinding. */
  readonly returnUrl = input<string>();

  protected readonly noticeText = (): string | null => {
    const notice = this.auth.notice();
    return notice ? SESSION_NOTICES[notice] : null;
  };

  protected readonly email = signal('user@supporthub.local');
  protected readonly password = signal('Demo1234!');
  protected readonly busy = signal(false);
  protected readonly loginError = signal<string | null>(null);
  protected readonly retryAfter = signal<number | null>(null);
  protected readonly result = signal<{ title: string; body: unknown } | null>(null);

  protected readonly demoUsers = [
    'user@supporthub.local',
    'agent@supporthub.local',
    'assets@supporthub.local',
    'admin@supporthub.local',
  ];

  protected readonly probes: Probe[] = [
    { label: 'GET /auth/me', path: '/auth/me' },
    { label: 'GET /tickets', path: '/tickets?size=1' },
    { label: 'GET /assets (staff)', path: '/assets?size=1' },
    { label: 'GET /users (solo ADMIN)', path: '/users?size=1' },
    { label: 'GET ticket inexistente', path: '/tickets/00000000-0000-0000-0000-000000000000' },
  ];

  protected async signIn(): Promise<void> {
    this.busy.set(true);
    this.loginError.set(null);
    this.retryAfter.set(null);
    try {
      await firstValueFrom(this.auth.login(this.email(), this.password()));
      const target = this.returnUrl();
      // Solo rutas internas
      await this.router.navigateByUrl(target?.startsWith('/') ? target : '/dev/session');
    } catch (error) {
      this.loginError.set(describeError(error));
      this.retryAfter.set(toApiError(error).retryAfterSeconds ?? null);
    } finally {
      this.busy.set(false);
    }
  }

  protected async probe(probe: Probe): Promise<void> {
    try {
      const body = await firstValueFrom(this.http.get(`${API_BASE}${probe.path}`));
      this.result.set({ title: `${probe.label} → OK`, body });
    } catch (error) {
      const apiError = toApiError(error);
      this.result.set({
        title: `${probe.label} → ${apiError.status} ${apiError.code}`,
        body: { mensajeParaLaPersona: describeError(error), detalleDelServidor: apiError.message },
      });
    }
  }

  /** Una escritura (POST) para ver viajar la cabecera X-XSRF-TOKEN y rotar las cookies. */
  protected async renewNow(): Promise<void> {
    try {
      await this.auth.refreshSession();
      this.result.set({ title: 'POST /auth/refresh → OK', body: { roles: this.auth.roles() } });
    } catch (error) {
      this.result.set({
        title: 'POST /auth/refresh → falló',
        body: { mensaje: describeError(error) },
      });
    }
  }
}
