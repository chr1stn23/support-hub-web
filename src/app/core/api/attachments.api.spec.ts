import { Attachment } from '@core/api/models';
import { AttachmentsApi, UploadEvent } from '@core/api/attachments.api';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpEventType, provideHttpClient } from '@angular/common/http';

const URL = '/api/v1/tickets/t-1/attachments';
const attachment: Attachment = {
  id: 'f-1',
  filename: 'log.txt',
  contentType: 'text/plain',
  sizeBytes: 4,
  uploadedBy: { id: 'u-1', fullName: 'Lucía' },
  createdAt: '2026-10-08T15:00:00Z',
  canDelete: true,
};

describe('AttachmentsApi', () => {
  let api: AttachmentsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AttachmentsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the attachments of a ticket', () => {
    api.list('t-1').subscribe();
    http.expectOne(URL).flush([attachment]);
  });

  describe('upload', () => {
    const file = () => new File(['hola'], 'log.txt', { type: 'text/plain' });

    it('sends the file as multipart, in the "file" part, asking for progress', () => {
      api.upload('t-1', file()).subscribe();

      const request = http.expectOne(URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.reportUploadProgress).toBe(true);
      const body = request.request.body as FormData;
      expect(body).toBeInstanceOf(FormData);
      expect((body.get('file') as File).name).toBe('log.txt');
      request.flush(attachment);
    });

    it('does not set the Content-Type by hand: the browser has to add the multipart boundary', () => {
      api.upload('t-1', file()).subscribe();
      const request = http.expectOne(URL);
      expect(request.request.headers.has('Content-Type')).toBe(false);
      request.flush(attachment);
    });

    it('reports the progress as a percentage and ends with the created attachment', () => {
      const events: UploadEvent[] = [];
      api.upload('t-1', file()).subscribe((event) => events.push(event));

      const request = http.expectOne(URL);
      request.event({ type: HttpEventType.Sent });
      request.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 200 });
      request.event({ type: HttpEventType.UploadProgress, loaded: 200, total: 200 });
      request.flush(attachment, { status: 201, statusText: 'Created' });

      expect(events).toEqual([
        { kind: 'progress', percent: 25 },
        { kind: 'progress', percent: 100 },
        { kind: 'done', attachment },
      ]);
    });

    it('reports 0 % when the browser does not know the total', () => {
      const events: UploadEvent[] = [];
      api.upload('t-1', file()).subscribe((event) => events.push(event));

      const request = http.expectOne(URL);
      request.event({ type: HttpEventType.UploadProgress, loaded: 50 });
      request.flush(attachment);

      expect(events[0]).toEqual({ kind: 'progress', percent: 0 });
    });

    it('aborts the upload when the subscription is cancelled', () => {
      const subscription = api.upload('t-1', file()).subscribe();
      const request = http.expectOne(URL);

      subscription.unsubscribe();
      expect(request.cancelled).toBe(true);
    });
  });

  it('downloads as a blob', () => {
    api.download('t-1', 'f-1').subscribe();
    const request = http.expectOne(`${URL}/f-1/download`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['x']));
  });

  it('deletes', () => {
    api.remove('t-1', 'f-1').subscribe();
    const request = http.expectOne(`${URL}/f-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
