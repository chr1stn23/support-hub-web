import { Component } from '@angular/core';

import { Icon } from './icon';
import { IconName, ICONS } from './icons';
import { TestBed } from '@angular/core/testing';

@Component({
  imports: [Icon],
  template: `
    <app-icon name="search" />
    <app-icon name="info" label="Información" [size]="20" />
  `,
})
class Host {}

describe('icons', () => {
  const names = Object.keys(ICONS) as IconName[];

  it.each(names)('%s has at least one well-formed shape', (name) => {
    const shapes = ICONS[name];
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      if (shape.tag === 'path') expect(shape.d).toBeTruthy();
      if (shape.tag === 'circle')
        expect([shape.cx, shape.cy, shape.r].every((n) => typeof n === 'number')).toBe(true);
      if (shape.tag === 'rect')
        expect([shape.x, shape.y, shape.w, shape.h].every((n) => typeof n === 'number')).toBe(true);
    }
  });

  it('includes every icon the priorities and navigation rely on', () => {
    for (const name of [
      'chevron-down',
      'equal',
      'chevron-up',
      'chevrons-up',
      'ticket',
      'laptop',
      'bell',
      'log-out',
    ]) {
      expect(names).toContain(name);
    }
  });
});

describe('Icon component', () => {
  it('renders the shapes inside a 24x24 svg and hides decorative icons from screen readers', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const [decorative, meaningful] = Array.from<SVGElement>(
      fixture.nativeElement.querySelectorAll('svg'),
    );
    expect(decorative.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
    expect(decorative.querySelectorAll('circle, path').length).toBe(ICONS.search.length);

    expect(meaningful.getAttribute('role')).toBe('img');
    expect(meaningful.getAttribute('aria-label')).toBe('Información');
    expect(meaningful.hasAttribute('aria-hidden')).toBe(false);
    expect(meaningful.getAttribute('width')).toBe('20');
  });
});