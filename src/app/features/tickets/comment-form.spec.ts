import { TicketComment } from '@core/api/models';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentForm } from '@features/tickets/comment-form';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ToastService } from '@shared/ui';

const URL = '/api/v1/tickets/t-1/comments';
const comment: TicketComment = {
  id: 'c-1',
  author: { id: 'u-1', fullName: 'Lucía Usuaria' },
  body: 'Hola',
  createdAt: '2026-10-08T15:00:00Z',
};
const errorBody = (status: number, code: string, fieldErrors: unknown[] = []) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors,
});

describe('CommentForm', () => {
  let fixture: ComponentFixture<CommentForm>;
  let http: HttpTestingController;
  let posted: TicketComment[];
  let locked: number;

  const el = () => fixture.nativeElement as HTMLElement;
  const textarea = () => el().querySelector<HTMLTextAreaElement>('textarea')!;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const settle = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function type(value: string): void {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    el()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CommentForm);
    fixture.componentRef.setInput('ticketId', 't-1');
    posted = [];
    locked = 0;
    fixture.componentInstance.posted.subscribe((c) => posted.push(c));
    fixture.componentInstance.locked.subscribe(() => locked++);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(ToastService).clear();
  });

  it('does not show an error before the person tries to send', () => {
    expect(text()).not.toContain('Escribe un comentario.');
  });

  it('refuses an empty comment, and one made only of spaces', () => {
    submit();
    expect(text()).toContain('Escribe un comentario.');
    expect(textarea().getAttribute('aria-invalid')).toBe('true');

    type('     ');
    submit();
    expect(text()).toContain('Escribe un comentario.');
    http.expectNone(URL);
  });

  it('refuses a comment that is too long', () => {
    type('x'.repeat(2001));
    submit();
    expect(text()).toContain('El comentario no puede superar los 2000 caracteres.');
    http.expectNone(URL);
  });

  it('sends the trimmed comment, clears the box and tells the page', async () => {
    type('  Ya probé reiniciarlo  ');
    submit();

    const request = http.expectOne(URL);
    expect(request.request.body).toEqual({ body: 'Ya probé reiniciarlo' });
    request.flush(comment);
    await settle();

    expect(posted).toEqual([comment]);
    expect(textarea().value).toBe('');
    expect(text()).not.toContain('Escribe un comentario.');
  });

  it('sends with Ctrl+Enter', () => {
    type('Con atajo');
    textarea().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        cancelable: true,
        bubbles: true,
      }),
    );
    http.expectOne(URL).flush(comment);
  });

  it('ignores a second send while the first is in flight', () => {
    type('Una sola vez');
    submit();
    submit();
    http.expectOne(URL); // expectOne falla si hubiera dos peticiones
  });

  it('keeps what was typed when the server fails, and says why', async () => {
    type('No quiero perder esto');
    submit();
    http
      .expectOne(URL)
      .flush(errorBody(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();

    expect(textarea().value).toBe('No quiero perder esto');
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.',
    );
    expect(posted).toEqual([]);
  });

  it('asks the page to reload when the ticket was closed in the meantime', async () => {
    type('Llego tarde');
    submit();
    http
      .expectOne(URL)
      .flush(errorBody(409, 'TICKET_LOCKED'), { status: 409, statusText: 'Conflict' });
    await settle();

    expect(locked).toBe(1);
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Este ticket está cerrado o cancelado y ya no admite cambios.',
    );
  });

  it('shows a field error of the server next to the box', async () => {
    type('Algo');
    submit();
    http
      .expectOne(URL)
      .flush(
        errorBody(400, 'VALIDATION_ERROR', [
          { field: 'body', code: 'Size', message: 'size must be' },
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(text()).toContain('El comentario no puede superar los 2000 caracteres.');
  });

  it('shows a character counter only when the text is getting long', () => {
    type('corto');
    expect(text()).not.toContain('/ 2000');
    type('x'.repeat(1850));
    expect(text()).toContain('1850 / 2000');
  });
});
