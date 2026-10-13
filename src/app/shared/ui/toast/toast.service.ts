import { Service, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
}

const DURATION_MS: Record<ToastKind, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};
const MAX_VISIBLE = 4;

@Service()
export class ToastService {
  private readonly items = signal<readonly Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;
  private paused = false;

  readonly toasts = this.items.asReadonly();

  success(message: string): number {
    return this.show('success', message);
  }

  error(message: string): number {
    return this.show('error', message);
  }

  warning(message: string): number {
    return this.show('warning', message);
  }

  info(message: string): number {
    return this.show('info', message);
  }

  show(kind: ToastKind, message: string): number {
    // El mismo aviso no se apila: se reinicia su tiempo
    const existing = this.items().find((t) => t.kind === kind && t.message === message);
    if (existing) {
      this.schedule(existing);
      return existing.id;
    }

    const toast: Toast = { id: this.nextId++, kind, message };
    let next = [...this.items(), toast];
    while (next.length > MAX_VISIBLE) {
      const [oldest, ...rest] = next;
      this.cancel(oldest.id);
      next = rest;
    }
    this.items.set(next);
    this.schedule(toast);
    return toast.id;
  }

  dismiss(id: number): void {
    this.cancel(id);
    this.items.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.items.set([]);
  }

  /** Mientras la persona tiene el ratón encima o el foco dentro, nada desaparece. */
  pause(): void {
    this.paused = true;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  resume(): void {
    this.paused = false;
    this.items().forEach((toast) => this.schedule(toast));
  }

  private schedule(toast: Toast): void {
    this.cancel(toast.id);
    if (this.paused) {
      return;
    }
    this.timers.set(
      toast.id,
      setTimeout(() => this.dismiss(toast.id), DURATION_MS[toast.kind]),
    );
  }

  private cancel(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }
}
