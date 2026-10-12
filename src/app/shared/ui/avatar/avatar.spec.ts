import { Component } from '@angular/core';
import { Avatar } from './avatar';
import { TestBed } from '@angular/core/testing';

@Component({
  imports: [Avatar],
  template: `
    <app-avatar name="Lucía Usuaria" />
    <app-avatar [name]="null" />
    <app-avatar [name]="null" emptyLabel="Sin agente" />
  `,
})
class Host {}

describe('Avatar', () => {
  it('shows the initials and names the person for screen readers', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const [named, empty, custom] = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('app-avatar'),
    );

    expect(named.textContent?.trim()).toBe('LU');
    expect(named.getAttribute('role')).toBe('img');
    expect(named.getAttribute('aria-label')).toBe('Lucía Usuaria');
    expect(named.className).toMatch(/tone-/);

    expect(empty.textContent?.trim()).toBe('');
    expect(empty.getAttribute('aria-label')).toBe('Sin asignar');
    expect(empty.classList).toContain('avatar--none');

    expect(custom.getAttribute('aria-label')).toBe('Sin agente');
  });
});
