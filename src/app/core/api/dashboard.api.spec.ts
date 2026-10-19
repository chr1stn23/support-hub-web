import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DashboardApi } from './dashboard.api';

describe('DashboardApi', () => {
  it('asks for the summary of the period', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(DashboardApi);
    const http = TestBed.inject(HttpTestingController);

    api.report(90).subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/dashboard/summary');
    expect(request.request.params.get('days')).toBe('90');
    request.flush({});
    http.verify();
  });
});
