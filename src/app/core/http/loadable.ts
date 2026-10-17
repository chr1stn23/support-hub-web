import { ApiError, toApiError } from '@core/api/api-error';
import { computed, signal, Signal } from '@angular/core';
import { catchError, map, Observable, of, scan, startWith, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

export type RemoteState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly previous: T | null }
  | { readonly status: 'success'; readonly value: T }
  | { readonly status: 'error'; readonly error: ApiError };

export interface Loadable<T> {
  readonly state: Signal<RemoteState<T>>;
  /** Lo último que se cargó bien. Sigue disponible mientras se recarga: la pantalla no parpadea. */
  readonly value: Signal<T | null>;
  reload(): void;
}

type Step<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; value: T }
  | { status: 'error'; error: ApiError };

const lastValue = <T>(state: RemoteState<T>): T | null =>
  state.status === 'success' ? state.value : state.status === 'loading' ? state.previous : null;

/**
 * Carga datos cada vez que cambian los parámetros (o se pide recargar), y cancela la petición
 * anterior si todavía no terminó. Con params() = null no carga nada. Se llama en un contexto de inyección.
 */
export function loadable<P, T>(
  params: () => P | false | null,
  load: (params: P) => Observable<T>,
): Loadable<T> {
  const tick = signal(0);
  const trigger = computed(() => ({ params: params(), tick: tick() }));

  const steps$ = toObservable(trigger).pipe(
    switchMap(({ params: p }): Observable<Step<T>> =>
      p === null || p === false
        ? of({ status: 'idle' })
        : load(p).pipe(
            map((value): Step<T> => ({ status: 'success', value })),
            startWith<Step<T>>({ status: 'loading' }),
            catchError((error: unknown) =>
              of<Step<T>>({ status: 'error', error: toApiError(error) }),
            ),
          ),
    ),
  );

  const initial: RemoteState<T> = { status: 'loading', previous: null };
  const state$ = steps$.pipe(
    scan(
      (previous: RemoteState<T>, step: Step<T>): RemoteState<T> =>
        step.status === 'loading' ? { status: 'loading', previous: lastValue(previous) } : step,
      initial,
    ),
  );

  const state = toSignal(state$, { initialValue: initial });
  return {
    state,
    value: computed(() => lastValue(state())),
    reload: () => tick.update((n) => n + 1),
  };
}
