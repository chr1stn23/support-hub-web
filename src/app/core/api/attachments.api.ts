import { Attachment } from '@core/api/models';
import { inject, Service } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { API_BASE } from '@core/api/api-config';
import { filter, map, Observable } from 'rxjs';

export type UploadEvent =
  | { readonly kind: 'progress'; readonly percent: number }
  | { readonly kind: 'done'; readonly attachment: Attachment };

@Service()
export class AttachmentsApi {
  private readonly http = inject(HttpClient);

  private url(ticketId: string): string {
    return `${API_BASE}/tickets/${ticketId}/attachments`;
  }

  list(ticketId: string): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(this.url(ticketId));
  }

  /** Emite el progreso (0–100) y, al final, el adjunto creado. Cancelar la suscripción aborta la subida. */
  upload(ticketId: string, file: File): Observable<UploadEvent> {
    const body = new FormData();
    body.append('file', file, file.name);

    return this.http
      .post<Attachment>(this.url(ticketId), body, { reportUploadProgress: true, observe: 'events' })
      .pipe(
        map((event): UploadEvent | null => {
          if (event.type === HttpEventType.UploadProgress) {
            const percent = event.total
              ? Math.min(100, Math.round((event.loaded / event.total) * 100))
              : 0;
            return { kind: 'progress', percent };
          }
          if (event.type === HttpEventType.Response) {
            return { kind: 'done', attachment: event.body as Attachment };
          }
          return null;
        }),
        filter((event): event is UploadEvent => event !== null),
      );
  }

  download(ticketId: string, attachmentId: string): Observable<Blob> {
    return this.http.get(`${this.url(ticketId)}/${attachmentId}/download`, {
      responseType: 'blob',
    });
  }

  remove(ticketId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.url(ticketId)}/${attachmentId}`);
  }
}
