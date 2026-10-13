import { TestBed } from "@angular/core/testing";
import { ToastService } from "./toast.service";

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
    vi.useRealTimers();
  });

  const messages = () => service.toasts().map((t) => t.message);

  it('shows a toast and removes it by itself', () => {
    service.success('Guardado');
    expect(messages()).toEqual(['Guardado']);

    vi.advanceTimersByTime(4001);
    expect(messages()).toEqual([]);
  });

  it('keeps errors on screen longer than successes', () => {
    service.success('ok');
    service.error('falló');

    vi.advanceTimersByTime(4001);
    expect(messages()).toEqual(['falló']);

    vi.advanceTimersByTime(4000);
    expect(messages()).toEqual([]);
  });

  it('does not stack the same message twice: it restarts its time', () => {
    service.info('Hola');
    vi.advanceTimersByTime(3000);
    service.info('Hola');
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(3000); // 6 s en total, pero el tiempo se reinició a los 3 s
    expect(messages()).toEqual(['Hola']);

    vi.advanceTimersByTime(2100);
    expect(messages()).toEqual([]);
  });

  it('treats the same text with a different kind as another toast', () => {
    service.info('Mismo texto');
    service.error('Mismo texto');
    expect(service.toasts()).toHaveLength(2);
  });

  it('keeps at most 4, dropping the oldest', () => {
    for (let i = 1; i <= 5; i++) {
      service.success(`Aviso ${i}`);
    }
    expect(messages()).toEqual(['Aviso 2', 'Aviso 3', 'Aviso 4', 'Aviso 5']);
  });

  it('dismisses one toast and cancels its timer', () => {
    const id = service.success('Uno');
    service.success('Dos');

    service.dismiss(id);
    expect(messages()).toEqual(['Dos']);

    vi.advanceTimersByTime(10_000);
    expect(messages()).toEqual([]);
  });

  it('does not remove anything while paused, and resumes afterwards', () => {
    service.success('Quieto');
    service.pause();

    vi.advanceTimersByTime(60_000);
    expect(messages()).toEqual(['Quieto']);

    service.resume();
    vi.advanceTimersByTime(4001);
    expect(messages()).toEqual([]);
  });

  it('a toast shown while paused waits for the resume', () => {
    service.pause();
    service.success('Nuevo');
    vi.advanceTimersByTime(60_000);
    expect(messages()).toEqual(['Nuevo']);

    service.resume();
    vi.advanceTimersByTime(4001);
    expect(messages()).toEqual([]);
  });

  it('clear removes everything', () => {
    service.success('a');
    service.error('b');
    service.clear();
    expect(service.toasts()).toEqual([]);
  });
});
