import { TestBed } from '@angular/core/testing';
import { ApplicationRef, Injector, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { loadable } from '@core/http/loadable';

describe('loadable', () => {
  const flush = async () => {
    TestBed.inject(ApplicationRef).tick(); // ejecuta los efectos (toObservable)
    await new Promise<void>((resolve) => setTimeout(resolve));
  };

  function setup<P, T>(initial: P | null) {
    const params = signal<P | null>(initial);
    const requests: { params: P; response: Subject<T> }[] = [];
    const resource = TestBed.runInInjectionContext(() =>
      loadable<P, T>(
        () => params(),
        (p) => {
          const response = new Subject<T>();
          requests.push({ params: p, response });
          return response;
        },
      ),
    );
    return { params, requests, resource };
  }

  it('starts loading and then shows the value', async () => {
    const { requests, resource } = setup<number, string>(1);
    await flush();

    expect(resource.state().status).toBe('loading');
    expect(resource.value()).toBeNull();

    requests[0].response.next('uno');
    await flush();
    expect(resource.state()).toEqual({ status: 'success', value: 'uno' });
    expect(resource.value()).toBe('uno');
  });

  it('reports a failure as an ApiError', async () => {
    const { requests, resource } = setup<number, string>(1);
    await flush();

    requests[0].response.error(new Error('boom'));
    await flush();

    const state = resource.state();
    expect(state.status).toBe('error');
    expect(state.status === 'error' && state.error.code).toBe('UNKNOWN_ERROR');
  });

  it('keeps the previous value while the next one loads', async () => {
    const { params, requests, resource } = setup<number, string>(1);
    await flush();
    requests[0].response.next('uno');
    await flush();

    params.set(2);
    await flush();

    expect(resource.state()).toEqual({ status: 'loading', previous: 'uno' });
    expect(resource.value()).toBe('uno');

    requests[1].response.next('dos');
    await flush();
    expect(resource.value()).toBe('dos');
  });

  it('ignores the answer of a request that was replaced (no stale data)', async () => {
    const { params, requests, resource } = setup<number, string>(1);
    await flush();

    params.set(2);
    await flush();
    requests[1].response.next('dos');
    await flush();

    requests[0].response.next('uno, demasiado tarde');
    await flush();
    expect(resource.value()).toBe('dos');
  });

  it('reloads with the same parameters', async () => {
    const { requests, resource } = setup<number, string>(1);
    await flush();
    requests[0].response.next('uno');
    await flush();

    resource.reload();
    await flush();
    expect(requests).toHaveLength(2);
    expect(requests[1].params).toBe(1);
  });

  it('does not load while the parameters are null, and loads once they exist', async () => {
    const { params, requests, resource } = setup<number, string>(null);
    await flush();
    expect(requests).toHaveLength(0);
    expect(resource.state().status).toBe('idle');

    params.set(5);
    await flush();
    expect(requests).toHaveLength(1);
    expect(requests[0].params).toBe(5);
  });

  it('does not load while the parameters are false either', async () => {
    const { params, requests, resource } = setup<true, string>(false as never);
    await flush();
    expect(requests).toHaveLength(0);
    expect(resource.state().status).toBe('idle');

    params.set(true);
    await flush();
    expect(requests).toHaveLength(1);
  });

  it('works inside an injector of its own', () => {
    expect(Injector).toBeDefined();
  });
});
