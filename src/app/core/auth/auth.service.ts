import { HttpClient, HttpContext } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { API_BASE } from '@core/api/api-config';
import { SessionNotice } from '@core/api/error-messages';
import { LoginResponse, Role, UserResponse } from '@core/api/models';
import { firstValueFrom, map, Observable, tap } from 'rxjs';
import { SKIP_SESSION_EXPIRY } from './http-context';
import { toApiError } from '@core/api/api-error';

/** Espera tras un CONCURRENT_REFRESH: otra pestaña ya renovó y dejó sus cookies en el navegador. */
const CONCURRENT_REFRESH_DELAY_MS = 300;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Llamadas de sesión: un 401 en ellas no debe provocar una renovación. */
const skipSessionExpiry = () => new HttpContext().set(SKIP_SESSION_EXPIRY, true);

/**
 * La sesión vive en cookies HttpOnly que JavaScript no puede leer: aquí solo guardamos
 * QUIÉN es la persona. No hay ningún token en memoria ni en el almacenamiento del navegador.
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userState = signal<UserResponse | null>(null);
  private readonly noticeState = signal<SessionNotice | null>(null);
  private readonly lastRefreshState = signal<number | null>(null);
  private refreshInFlight: Promise<void> | null = null;

  readonly user = this.userState.asReadonly();
  /** Por qué se perdió la sesión (para mostrarlo en el login). */
  readonly notice = this.noticeState.asReadonly();
  /** Cuándo se renovó la sesión por última vez (ms desde epoch). Útil para depurar. */
  readonly lastRefreshAt = this.lastRefreshState.asReadonly();

  readonly isAuthenticated = computed(() => this.userState() !== null);
  readonly roles = computed<Role[]>(() => this.userState()?.roles ?? []);

  hasRole(role: Role): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(roles: readonly Role[]): boolean {
    const mine = this.roles();
    return roles.some((role) => mine.includes(role));
  }

  login(email: string, password: string): Observable<UserResponse> {
    return this.http
      .post<LoginResponse>(
        `${API_BASE}/auth/login`,
        { email, password },
        { context: skipSessionExpiry() },
      )
      .pipe(
        tap((response) => {
          this.userState.set(response.user);
          this.noticeState.set(null);
        }),
        map((response) => response.user),
      );
  }

  /**
   * Se ejecuta una vez al arrancar: pregunta al servidor quién es la persona. Si el access token
   * venció, el interceptor de sesión renueva y reintenta sin que esto se entere.
   */
  async restore(): Promise<void> {
    try {
      this.userState.set(await firstValueFrom(this.http.get<UserResponse>(`${API_BASE}/auth/me`)));
    } catch (error) {
      this.userState.set(null);
      if (toApiError(error).status === 0) {
        this.noticeState.set('unavailable');
      }
      // Cualquier otro fallo es "no hay sesión": un visitante nuevo no recibe ningún aviso
    }
  }

  /**
   * Renueva la sesión con la cookie de refresh. Si varias peticiones lo piden a la vez,
   * se hace UNA sola renovación y todas esperan el mismo resultado.
   */
  refreshSession(): Promise<void> {
    this.refreshInFlight ??= this.renew().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  logout(): void {
    // Revoca el refresh token en el servidor; aunque falle, esta pestaña queda sin sesión
    this.http
      .post<void>(`${API_BASE}/auth/logout`, null, { context: skipSessionExpiry() })
      .subscribe({ error: () => undefined });
    this.endSession();
    void this.router.navigate(['/login']);
  }

  /** La renovación falló: la sesión murió con la aplicación en marcha. */
  expireSession(): void {
    if (this.userState() === null) {
      return; // ya era anónimo (o ya se cerró): nada que avisar
    }
    const returnUrl = this.router.url;
    this.endSession();
    this.noticeState.set('expired');
    if (!returnUrl.startsWith('/login')) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl } });
    }
  }

  clearNotice(): void {
    this.noticeState.set(null);
  }

  private async renew(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${API_BASE}/auth/refresh`, null, {
          context: skipSessionExpiry(),
        }),
      );
      this.userState.set(response.user); // los roles pueden haber cambiado
    } catch (error) {
      if (toApiError(error).code !== 'CONCURRENT_REFRESH') {
        throw error;
      }
      // Otra pestaña renovó a la vez: sus cookies ya están en el navegador. Recargamos quién somos con ellas
      await sleep(CONCURRENT_REFRESH_DELAY_MS);
      this.userState.set(
        await firstValueFrom(
          this.http.get<UserResponse>(`${API_BASE}/auth/me`, { context: skipSessionExpiry() }),
        ),
      );
    }
    this.lastRefreshState.set(Date.now());
  }

  private endSession(): void {
    this.userState.set(null);
  }
}