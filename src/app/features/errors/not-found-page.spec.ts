import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './not-found-page';

describe('NotFoundPage', () => {
  it('creates the component and renders the not found state', async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotFoundPage);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-empty-state')).not.toBeNull();
    expect(compiled.textContent).toContain('No encontramos esta página');

    const link = compiled.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href') ?? link?.getAttribute('ng-reflect-router-link')).toBe('/');
  });
});
