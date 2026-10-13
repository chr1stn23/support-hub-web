import { Component, signal } from '@angular/core';
import { Pagination } from './pagination';
import { TestBed } from '@angular/core/testing';

@Component({
  imports: [Pagination],
  template: `
    <app-pagination
      [page]="page()"
      [size]="size()"
      [totalElements]="total()"
      (pageChange)="pages.push($event)"
      (sizeChange)="sizes.push($event)"
    />
  `,
})
class Host {
  readonly page = signal(0);
  readonly size = signal(20);
  readonly total = signal(135);
  readonly pages: number[] = [];
  readonly sizes: number[] = [];
}

describe('Pagination', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const button = (label: string) =>
      el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
    return { fixture, host: fixture.componentInstance, el, button, text };
  }

  it('shows the range and the page', () => {
    const { text } = setup();
    expect(text()).toContain('Mostrando 1–20 de 135');
    expect(text()).toContain('Página 1 de 7');
  });

  it('shortens the range on the last page', () => {
    const { fixture, host, text } = setup();
    host.page.set(6);
    fixture.detectChanges();
    expect(text()).toContain('Mostrando 121–135 de 135');
    expect(text()).toContain('Página 7 de 7');
  });

  it('disables "first" and "previous" on the first page', () => {
    const { button } = setup();
    expect(button('Primera página').hasAttribute('disabled')).toBe(true);
    expect(button('Página anterior').hasAttribute('disabled')).toBe(true);
    expect(button('Página siguiente').hasAttribute('disabled')).toBe(false);
  });

  it('disables "next" and "last" on the last page', () => {
    const { fixture, host, button } = setup();
    host.page.set(6);
    fixture.detectChanges();
    expect(button('Página siguiente').hasAttribute('disabled')).toBe(true);
    expect(button('Última página').hasAttribute('disabled')).toBe(true);
    expect(button('Página anterior').hasAttribute('disabled')).toBe(false);
  });

  it('asks for the right page', () => {
    const { fixture, host, button } = setup();
    host.page.set(3);
    fixture.detectChanges();

    button('Página siguiente').click();
    button('Página anterior').click();
    button('Primera página').click();
    button('Última página').click();

    expect(host.pages).toEqual([4, 2, 0, 6]);
  });

  it('says there are no results and offers nowhere to go', () => {
    const { fixture, host, text, button } = setup();
    host.total.set(0);
    fixture.detectChanges();

    expect(text()).toContain('Sin resultados');
    expect(text()).toContain('Página 1 de 1');
    expect(button('Página siguiente').hasAttribute('disabled')).toBe(true);
  });

  it('reports a new page size', () => {
    const { el, host } = setup();
    const select = el.querySelector<HTMLSelectElement>('select')!;
    expect(select.value).toBe('20');

    select.value = '50';
    select.dispatchEvent(new Event('change'));
    expect(host.sizes).toEqual([50]);
  });
});
