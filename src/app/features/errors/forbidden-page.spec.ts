import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ForbiddenPage } from './forbidden-page';

describe('ForbiddenPage', () => {
  it('creates the component and renders the access denied state', async () => {
    await TestBed.configureTestingModule({
      imports: [ForbiddenPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(ForbiddenPage);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-empty-state')).not.toBeNull();
    expect(compiled.textContent).toContain('No tienes acceso a esta sección');

    const link = compiled.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href') ?? link?.getAttribute('ng-reflect-router-link')).toBe('/');
  });
});
