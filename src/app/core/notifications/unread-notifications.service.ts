import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { API_BASE } from '@core/api/api-config';
import { UnreadCountResponse } from '@core/api/models';
import { firstValueFrom } from 'rxjs';

const POLL_INTERVAL_MS = 60_000;

@Service()
export class UnreadNotifications {
  private readonly http = inject(HttpClient);
  private readonly countState = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly count = this.countState.asReadonly();

  start(): void {
    if (this.timer !== null) {
      return;
    }
    void this.refresh();
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void this.refresh();
      }
    }, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.countState.set(0);
  }

  async refresh(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<UnreadCountResponse>(`${API_BASE}/notifications/unread-count`),
      );
      this.countState.set(response.count);
    } catch {
      // Silencioso a propósito: avisar de un fallo cada minuto molestaría más que el propio fallo
    }
  }

  set(count: number): void {
    this.countState.set(Math.max(0, count));
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.refresh();
    }
  };
}
