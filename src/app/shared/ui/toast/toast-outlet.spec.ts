import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { ToastOutlet } from './toast-outlet';

describe('ToastOutlet', () => {
  function setup() {
    const fixture = TestBed.createComponent(ToastOutlet);
    const service = TestBed.inject(ToastService);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      service,
      el,
      items: () => Array.from<HTMLElement>(el.querySelectorAll('.toast')),
    };
  }

  afterEach(() => TestBed.inject(ToastService).clear());

  it('announces toasts politely, and errors as alerts', () => {
    const { fixture, service, el, items } = setup();
    service.success('Guardado');
    service.error('Falló algo');
    fixture.detectChanges();

    expect(el.querySelector('.stack')?.getAttribute('aria-live')).toBe('polite');
    expect(items()[0].getAttribute('role')).toBe('status');
    expect(items()[1].getAttribute('role')).toBe('alert');
    expect(items()[0].textContent).toContain('Guardado');
  });

  it('colours each kind with its tone', () => {
    const { fixture, service, items } = setup();
    service.success('a');
    service.error('b');
    service.warning('c');
    service.info('d');
    fixture.detectChanges();

    expect(items().map((i) => i.className.match(/tone-[\w-]+/)?.[0])).toEqual([
      'tone-success',
      'tone-danger',
      'tone-warning',
      'tone-accent',
    ]);
  });

  it('closes a toast with its button', () => {
    const { fixture, service, el, items } = setup();
    service.info('Cerrame');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('.toast__close')!.click();
    fixture.detectChanges();
    expect(items()).toHaveLength(0);
    expect(service.toasts()).toHaveLength(0);
  });

  it('pauses while the pointer or the focus is inside, and resumes afterwards', () => {
    const { service, el } = setup();
    const pause = vi.spyOn(service, 'pause');
    const resume = vi.spyOn(service, 'resume');
    const stack = el.querySelector('.stack')!;

    stack.dispatchEvent(new MouseEvent('mouseenter'));
    stack.dispatchEvent(new MouseEvent('mouseleave'));
    stack.dispatchEvent(new FocusEvent('focusin'));
    stack.dispatchEvent(new FocusEvent('focusout'));

    expect(pause).toHaveBeenCalledTimes(2);
    expect(resume).toHaveBeenCalledTimes(2);
  });

  it('gives the close button an accessible name', () => {
    const { fixture, service, el } = setup();
    service.info('x');
    fixture.detectChanges();
    expect(el.querySelector('.toast__close')?.getAttribute('aria-label')).toBe('Cerrar aviso');
  });
});
