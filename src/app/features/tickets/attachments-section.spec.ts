import { HttpEventType, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { Attachment } from '@core/api/models';
import { errorInterceptor } from '@core/auth/error.interceptor';
import { FileSaver } from '@core/http/file-saver';
import { DialogService, ToastService } from '@shared/ui';
import { AttachmentsSection } from './attachments-section';

const LIST = '/api/v1/tickets/t-1/attachments';

const attachment = (overrides: Partial<Attachment> = {}): Attachment => ({
  id: 'f-1',
  filename: 'captura.png',
  contentType: 'image/png',
  sizeBytes: 1536,
  uploadedBy: { id: 'u-1', fullName: 'Lucía Usuaria' },
  createdAt: new Date(Date.now() - 600_000).toISOString(),
  canDelete: true,
  ...overrides,
});

const errorBody = (status: number, code: string) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors: [],
});
const file = (name: string, size = 4, type = 'text/plain') => {
  const f = new File(['hola'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('AttachmentsSection', () => {
  let fixture: ComponentFixture<AttachmentsSection>;
  let http: HttpTestingController;
  let locked: number;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
    );
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };
  const posts = () => http.match((r) => r.method === 'POST' && r.url === LIST);

  async function setup(files: Attachment[] = [], canAttach = true) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AttachmentsSection);
    fixture.componentRef.setInput('ticketId', 't-1');
    fixture.componentRef.setInput('canAttach', canAttach);
    locked = 0;
    fixture.componentInstance.locked.subscribe(() => locked++);
    await settle();
    http.expectOne(LIST).flush(files);
    await settle();
  }

  function pick(...files: File[]): void {
    const input = el().querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function dropEvent(type: string, files: File[], types = ['Files']): Event {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files, types } });
    return event;
  }

  afterEach(() => {
    fixture?.destroy();
    http.verify({ ignoreCancelled: true });
    TestBed.inject(ToastService).clear();
  });

  describe('the list', () => {
    it('shows each attachment with its kind, size, author and when', async () => {
      await setup([attachment()]);
      expect(text()).toContain('captura.png');
      expect(text()).toContain('Imagen');
      expect(text()).toMatch(/1[.,]5 KB/);
      expect(text()).toContain('Lucía Usuaria');
      expect(text()).toContain('hace 10 min');
      expect(text()).toContain('Adjuntos 1');
    });

    it('shows the file name as plain text, never as HTML', async () => {
      await setup([attachment({ filename: '<img src=x onerror=alert(1)>.png' })]);
      expect(el().querySelector('.file img')).toBeNull();
      expect(el().querySelector('.file .name')?.textContent).toBe(
        '<img src=x onerror=alert(1)>.png',
      );
    });

    it('says there are none yet', async () => {
      await setup([]);
      expect(text()).toContain('Aún no hay adjuntos.');
    });

    it('offers delete only where the server allows it', async () => {
      await setup([
        attachment({ id: 'f-1', filename: 'mio.png', canDelete: true }),
        attachment({ id: 'f-2', filename: 'ajeno.png', canDelete: false }),
      ]);
      expect(button('Eliminar mio.png')).toBeTruthy();
      expect(button('Eliminar ajeno.png')).toBeUndefined();
      expect(button('Descargar ajeno.png')).toBeTruthy();
    });

    it('shows an error with a retry when it cannot load', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([errorInterceptor])),
          provideHttpClientTesting(),
        ],
      });
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(AttachmentsSection);
      fixture.componentRef.setInput('ticketId', 't-1');
      await settle();
      http
        .expectOne(LIST)
        .flush(errorBody(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      await settle();

      expect(text()).toContain('No pudimos cargar los adjuntos');
      button('Reintentar')!.click();
      await settle();
      http.expectOne(LIST).flush([attachment()]);
      await settle();
      expect(text()).toContain('captura.png');
    });
  });

  describe('permissions', () => {
    it('offers the upload area when the ticket allows attachments', async () => {
      await setup([], true);
      expect(el().querySelector('.drop')).not.toBeNull();
      expect(text()).toContain('Hasta 10 archivos de 5 MB');
    });

    it('keeps the list but hides the upload area on a closed ticket', async () => {
      await setup([attachment()], false);
      expect(el().querySelector('.drop')).toBeNull();
      expect(text()).toContain('ya no admite adjuntos nuevos');
      expect(text()).toContain('captura.png');
      expect(button('Descargar captura.png')).toBeTruthy();
    });

    it('ignores dropped files when the ticket does not allow attachments', async () => {
      await setup([], false);
      el().dispatchEvent(dropEvent('drop', [file('a.txt')]));
      await settle();
      expect(posts()).toHaveLength(0);
    });
  });

  describe('uploading', () => {
    it('sends the file, shows the progress and refreshes the list when it ends', async () => {
      await setup([]);
      pick(file('log.txt'));
      await settle();

      const [request] = posts();
      expect((request.request.body as FormData).get('file')).toBeInstanceOf(File);
      expect(text()).toContain('log.txt');

      request.event({ type: HttpEventType.UploadProgress, loaded: 40, total: 100 });
      fixture.detectChanges();
      expect(el().querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40');
      expect(text()).toContain('40 %');

      request.event({ type: HttpEventType.UploadProgress, loaded: 100, total: 100 });
      fixture.detectChanges();
      expect(text()).toContain('Procesando…');

      request.flush(attachment({ id: 'f-9', filename: 'log.txt', contentType: 'text/plain' }), {
        status: 201,
        statusText: 'Created',
      });
      await settle();
      http
        .expectOne(LIST)
        .flush([attachment({ id: 'f-9', filename: 'log.txt', contentType: 'text/plain' })]);
      await settle();

      expect(el().querySelector('.queued')).toBeNull();
      expect(el().querySelector('.file .name')?.textContent).toBe('log.txt');
      expect(TestBed.inject(ToastService).toasts()[0].message).toBe('Subiste 1 archivo.');
    });

    it('uploads several files one at a time, in order, with a single thank-you at the end', async () => {
      await setup([]);
      pick(file('a.txt'), file('b.txt'));
      await settle();

      expect(posts()).toHaveLength(1);
      expect(text()).toContain('En espera');
    });

    it('starts the next file once the previous one ends', async () => {
      await setup([]);
      pick(file('a.txt'), file('b.txt'));
      await settle();

      const first = http.expectOne((r) => r.method === 'POST');
      first.flush(attachment({ id: 'f-1', filename: 'a.txt' }), {
        status: 201,
        statusText: 'Created',
      });
      await settle();
      http.expectOne((r) => r.method === 'GET' && r.url === LIST).flush([]);

      const second = http.expectOne((r) => r.method === 'POST');
      expect((second.request.body as FormData).get('file')).toHaveProperty('name', 'b.txt');
      second.flush(attachment({ id: 'f-2', filename: 'b.txt' }), {
        status: 201,
        statusText: 'Created',
      });
      await settle();
      http.expectOne((r) => r.method === 'GET' && r.url === LIST).flush([]);
      await settle();

      expect(
        TestBed.inject(ToastService)
          .toasts()
          .map((t) => t.message),
      ).toEqual(['Subiste 2 archivos.']);
    });

    it('lets the same file be chosen twice in a row', async () => {
      await setup([]);
      const input = el().querySelector<HTMLInputElement>('input[type="file"]')!;
      const reset = vi.fn();
      Object.defineProperty(input, 'value', { get: () => '', set: reset, configurable: true });

      pick(file('a.txt'));

      expect(reset).toHaveBeenCalledWith('');
    });

    it('cancels an upload in progress, aborting the request, and moves on to the next one', async () => {
      await setup([]);
      pick(file('a.txt'), file('b.txt'));
      await settle();
      const first = http.expectOne((r) => r.method === 'POST');

      button('Cancelar la subida de a.txt')!.click();
      await settle();

      expect(first.cancelled).toBe(true);
      const second = http.expectOne((r) => r.method === 'POST');
      expect((second.request.body as FormData).get('file')).toHaveProperty('name', 'b.txt');
    });

    it('removes a file that is still waiting', async () => {
      await setup([]);
      pick(file('a.txt'), file('b.txt'));
      await settle();

      button('Quitar b.txt')!.click();
      await settle();

      expect(button('Quitar b.txt')).toBeUndefined();
      const queuedText = Array.from(el().querySelectorAll('.queued'))
        .map((node) => node.textContent ?? '')
        .join(' ');
      expect(queuedText).not.toContain('b.txt');
    });

    it('shows why an upload failed, lets the person retry, and keeps going with the others', async () => {
      await setup([]);
      pick(file('a.txt'), file('b.txt'));
      await settle();

      http
        .expectOne((r) => r.method === 'POST')
        .flush(errorBody(415, 'UNSUPPORTED_FILE_TYPE'), { status: 415, statusText: 'Unsupported' });
      await settle();

      expect(el().querySelector('.queued [role="alert"]')?.textContent).toContain(
        'Tipo de archivo no permitido',
      );
      const second = http.expectOne((r) => r.method === 'POST');
      expect((second.request.body as FormData).get('file')).toHaveProperty('name', 'b.txt');
      second.flush(attachment({ id: 'f-2', filename: 'b.txt' }), {
        status: 201,
        statusText: 'Created',
      });
      await settle();
      http.expectOne((r) => r.method === 'GET' && r.url === LIST).flush([]);

      button('Reintentar')!.click();
      await settle();
      expect(
        (http.expectOne((r) => r.method === 'POST').request.body as FormData).get('file'),
      ).toHaveProperty('name', 'a.txt');
    });

    it('tells the page when the ticket got locked in the meantime', async () => {
      await setup([]);
      pick(file('a.txt'));
      await settle();
      posts()[0].flush(errorBody(409, 'TICKET_LOCKED'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(locked).toBe(1);
      expect(text()).toContain('cerrado o cancelado');
    });
  });

  describe('what is checked before sending', () => {
    it('rejects the wrong format, an empty file and a heavy one, naming each', async () => {
      await setup([]);
      pick(
        file('virus.exe'),
        file('vacio.txt', 0),
        file('enorme.pdf', 6 * 1024 * 1024),
        file('bien.txt'),
      );
      await settle();

      const rejections = el().querySelector('.rejections')?.textContent ?? '';
      expect(rejections).toContain('virus.exe');
      expect(rejections).toContain('vacio.txt');
      expect(rejections).toContain('enorme.pdf');
      expect(rejections).not.toContain('bien.txt');
      expect((posts()[0].request.body as FormData).get('file')).toHaveProperty('name', 'bien.txt');
    });

    it('sends nothing when every file is rejected', async () => {
      await setup([]);
      pick(file('virus.exe'));
      await settle();
      expect(posts()).toHaveLength(0);
      expect(el().querySelector('.rejections')).not.toBeNull();
    });

    it('dismisses the notice', async () => {
      await setup([]);
      pick(file('virus.exe'));
      await settle();
      button('Entendido')!.click();
      fixture.detectChanges();
      expect(el().querySelector('.rejections')).toBeNull();
    });

    it('stops accepting files when the ticket is full, and says so', async () => {
      const full = Array.from({ length: 10 }, (_, i) =>
        attachment({ id: `f-${i}`, filename: `a${i}.png` }),
      );
      await setup(full);

      expect(text()).toContain('Este ticket ya tiene el máximo de 10 adjuntos.');
      expect(button('Seleccionar archivos')?.hasAttribute('disabled')).toBe(true);

      pick(file('mas.txt'));
      await settle();
      expect(posts()).toHaveLength(0);
      expect(el().querySelector('.rejections')?.textContent).toContain('máximo de 10 adjuntos');
    });

    it('counts the files waiting in the queue against the limit', async () => {
      const nine = Array.from({ length: 9 }, (_, i) =>
        attachment({ id: `f-${i}`, filename: `a${i}.png` }),
      );
      await setup(nine);
      pick(file('uno.txt'), file('dos.txt'));
      await settle();

      expect(el().querySelector('.queued .name')?.textContent).toContain('uno.txt');
      expect(el().querySelector('.rejections')?.textContent).toContain('dos.txt');
    });
  });

  describe('drag and drop', () => {
    it('highlights the zone while files are dragged over it, and allows the drop', async () => {
      await setup([]);
      const zone = el().querySelector<HTMLElement>('.drop')!;
      const over = dropEvent('dragover', [], ['Files']);

      zone.dispatchEvent(over);
      fixture.detectChanges();

      expect(over.defaultPrevented).toBe(true);
      expect(zone.classList).toContain('is-dragging');
    });

    it('ignores dragging something that is not a file (for example, selected text)', async () => {
      await setup([]);
      const zone = el().querySelector<HTMLElement>('.drop')!;
      const over = dropEvent('dragover', [], ['text/plain']);

      zone.dispatchEvent(over);
      fixture.detectChanges();

      expect(over.defaultPrevented).toBe(false);
      expect(zone.classList).not.toContain('is-dragging');
    });

    it('stops highlighting when the files leave', async () => {
      await setup([]);
      const zone = el().querySelector<HTMLElement>('.drop')!;
      zone.dispatchEvent(dropEvent('dragover', [], ['Files']));
      fixture.detectChanges();
      zone.dispatchEvent(new Event('dragleave', { bubbles: true }));
      fixture.detectChanges();

      expect(zone.classList).not.toContain('is-dragging');
    });

    it('uploads the dropped files, and stops the browser from opening them', async () => {
      await setup([]);
      const zone = el().querySelector<HTMLElement>('.drop')!;
      const drop = dropEvent('drop', [file('arrastrado.txt')]);

      zone.dispatchEvent(drop);
      await settle();

      expect(drop.defaultPrevented).toBe(true);
      expect((posts()[0].request.body as FormData).get('file')).toHaveProperty(
        'name',
        'arrastrado.txt',
      );
      expect(zone.classList).not.toContain('is-dragging');
    });
  });

  describe('downloading', () => {
    it('downloads through the API and hands the file to the browser with its own name', async () => {
      await setup([attachment({ filename: 'informe ñandú.pdf' })]);
      const save = vi.spyOn(TestBed.inject(FileSaver), 'save').mockImplementation(() => undefined);

      button('Descargar informe ñandú.pdf')!.click();
      const request = http.expectOne(`${LIST}/f-1/download`);
      expect(request.request.responseType).toBe('blob');
      const blob = new Blob(['contenido']);
      request.flush(blob);
      await settle();

      expect(save).toHaveBeenCalledWith(blob, 'informe ñandú.pdf');
    });

    it('does not start a second download while one is running', async () => {
      await setup([attachment()]);
      vi.spyOn(TestBed.inject(FileSaver), 'save').mockImplementation(() => undefined);

      button('Descargar captura.png')!.click();
      button('Descargar captura.png')!.click();
      http.expectOne(`${LIST}/f-1/download`); // expectOne falla si hubiera dos peticiones
    });

    it('explains a failed download (the error comes inside a blob) and refreshes the list when the file is gone', async () => {
      await setup([attachment()]);
      const save = vi.spyOn(TestBed.inject(FileSaver), 'save');

      button('Descargar captura.png')!.click();
      http.expectOne(`${LIST}/f-1/download`).flush(
        new Blob([JSON.stringify(errorBody(404, 'RESOURCE_NOT_FOUND'))], {
          type: 'application/json',
        }),
        { status: 404, statusText: 'Not Found' },
      );
      await settle();

      expect(save).not.toHaveBeenCalled();
      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        '«captura.png» ya no está disponible.',
      );
      http.expectOne((r) => r.method === 'GET' && r.url === LIST).flush([]);
    });
  });

  describe('deleting', () => {
    it('asks first, with a destructive confirmation that names the file', async () => {
      await setup([attachment()]);
      const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(false);

      button('Eliminar captura.png')!.click();
      await settle();

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eliminar adjunto',
          destructive: true,
          message: expect.stringContaining('captura.png'),
        }),
      );
      http.expectNone(`${LIST}/f-1`);
    });

    it('deletes, says so, and refreshes the list', async () => {
      await setup([attachment()]);
      vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);

      button('Eliminar captura.png')!.click();
      await settle();
      const request = http.expectOne(`${LIST}/f-1`);
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe('Eliminaste «captura.png».');
      http.expectOne((r) => r.method === 'GET' && r.url === LIST).flush([]);
      await settle();
      expect(text()).toContain('Aún no hay adjuntos.');
    });

    it('explains a refusal, tells the page if the ticket got locked, and still refreshes', async () => {
      await setup([attachment()]);
      vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);

      button('Eliminar captura.png')!.click();
      await settle();
      http
        .expectOne(`${LIST}/f-1`)
        .flush(errorBody(409, 'TICKET_LOCKED'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Este ticket está cerrado o cancelado y ya no admite cambios.',
      );
      expect(locked).toBe(1);
      http.expectOne((r) => r.method === 'GET' && r.url === LIST).flush([attachment()]);
    });
  });
});
