import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/auth/auth.service';
import { describe, expect, it, vi } from 'vitest';
import { appConfig } from './app.config';

describe('App Config', () => {
  it('defines application providers and initializes auth service', async () => {
    expect(appConfig.providers.length).toBeGreaterThan(0);

    const mockAuthService = {
      restore: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [...appConfig.providers, { provide: AuthService, useValue: mockAuthService }],
    });

    const initStatus = TestBed.inject(ApplicationInitStatus);
    await initStatus.donePromise;

    expect(mockAuthService.restore).toHaveBeenCalledTimes(1);
  });
});
