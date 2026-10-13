import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { UnreadNotifications } from './unread-notifications.service';

const URL = '/api/v1/notifications/unread-count';

describe('UnreadNotifications', () => {
  let service: UnreadNotifications;
  let http: HttpTestingController;

  const setVisibility = (state: 'visible' | 'hidden') =>
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });

  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UnreadNotifications);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stop();
    http.verify();
    vi.useRealTimers();
    setVisibility('visible');
  });

  it('asks for the count right away', async () => {
    service.start();
    http.expectOne(URL).flush({ count: 3 });
    await vi.advanceTimersByTimeAsync(0);

    expect(service.count()).toBe(3);
  });

  it('asks again every minute', async () => {
    service.start();
    http.expectOne(URL).flush({ count: 1 });
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(60_000);
    http.expectOne(URL).flush({ count: 5 });
    await vi.advanceTimersByTimeAsync(0);

    expect(service.count()).toBe(5);
  });

  it('does not ask while the tab is hidden', async () => {
    service.start();
    http.expectOne(URL).flush({ count: 1 });
    await vi.advanceTimersByTimeAsync(0);

    setVisibility('hidden');
    await vi.advanceTimersByTimeAsync(180_000);
    http.expectNone(URL);
  });

  it('refreshes as soon as the tab becomes visible again', async () => {
    service.start();
    http.expectOne(URL).flush({ count: 1 });
    await vi.advanceTimersByTimeAsync(0);

    setVisibility('hidden');
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    http.expectOne(URL).flush({ count: 7 });
    await vi.advanceTimersByTimeAsync(0);

    expect(service.count()).toBe(7);
  });

  it('keeps the last count and stays quiet when the request fails', async () => {
    service.start();
    http.expectOne(URL).flush({ count: 4 });
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(60_000);
    http.expectOne(URL).error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(0);

    expect(service.count()).toBe(4);
  });

  it('start is idempotent: calling it twice does not double the polling', async () => {
    service.start();
    service.start();
    http.expectOne(URL).flush({ count: 0 }); // expectOne falla si hubiera dos peticiones
    await vi.advanceTimersByTimeAsync(0);
  });

  it('stop cancels the polling and resets the count', async () => {
    service.start();
    http.expectOne(URL).flush({ count: 9 });
    await vi.advanceTimersByTimeAsync(0);

    service.stop();
    expect(service.count()).toBe(0);

    await vi.advanceTimersByTimeAsync(180_000);
    http.expectNone(URL);
  });

  it('lets a screen set the count (for example after marking everything as read)', () => {
    service.set(12);
    expect(service.count()).toBe(12);
    service.set(-3);
    expect(service.count()).toBe(0);
  });
});
