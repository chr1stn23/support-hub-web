import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  WritableSignal,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Subscription, firstValueFrom, map } from 'rxjs';

import { toApiError } from '@core/api/api-error';
import { describeError } from '@core/api/error-messages';
import { AttachmentsApi } from '@core/api/attachments.api';
import type { Attachment } from '@core/api/models';
import { FileSaver } from '@core/http/file-saver';
import { loadable } from '@core/http/loadable';
import { Button, DialogService, ErrorState, Icon, Skeleton, Time, ToastService } from '@shared/ui';
import {
  ACCEPT_ATTRIBUTE,
  LIMITS_HINT,
  MAX_FILES_PER_TICKET,
  fileKind,
  formatBytes,
  validateBatch,
} from './attachment-rules';

interface UploadItem {
  readonly id: number;
  readonly file: File;
  readonly status: 'queued' | 'uploading' | 'error';
  /** 0–100. */
  readonly percent: number;
  readonly error: string | null;
}

const hasFiles = (event: DragEvent): boolean =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files');

@Component({
  selector: 'app-attachments-section',
  imports: [Button, Icon, Time, Skeleton, ErrorState],
  templateUrl: './attachments-section.html',
  styleUrl: './attachments-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentsSection implements OnDestroy {
  readonly ticketId = input.required<string>();
  /** Viene de actions.attach del ticket: false cuando está cerrado o cancelado. */
  readonly canAttach = input(false, { transform: booleanAttribute });
  /** El servidor dijo que el ticket ya no admite cambios: la página debe recargarlo. */
  readonly locked = output<void>();

  private readonly api = inject(AttachmentsApi);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly saver = inject(FileSaver);

  protected readonly accept = ACCEPT_ATTRIBUTE;
  protected readonly limitsHint = LIMITS_HINT;
  protected readonly maxFiles = MAX_FILES_PER_TICKET;

  // Cada carga recuerda PARA QUÉ ticket se hizo: nunca se muestra, ni un instante, lo del ticket anterior
  private readonly list = loadable(
    () => this.ticketId(),
    (id) => this.api.list(id).pipe(map((items) => ({ id, items }))),
  );
  protected readonly files = computed(() => {
    const loaded = this.list.value();
    return loaded && loaded.id === this.ticketId() ? loaded.items : null;
  });
  protected readonly listFailed = computed(() => this.list.state().status === 'error');

  protected readonly queue = signal<readonly UploadItem[]>([]);
  protected readonly rejections = signal<readonly string[]>([]);
  protected readonly announcement = signal('');
  protected readonly dragging = signal(false);
  private readonly downloadingIds = signal<ReadonlySet<string>>(new Set());
  private readonly deletingIds = signal<ReadonlySet<string>>(new Set());

  protected readonly slotsLeft = computed(
    () => MAX_FILES_PER_TICKET - (this.files()?.length ?? 0) - this.queue().length,
  );

  private nextId = 1;
  private activeId: number | null = null;
  private subscription: Subscription | null = null;
  private uploadedInBatch = 0;

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  protected kind(file: Attachment) {
    return fileKind(file.contentType);
  }

  protected size(bytes: number): string {
    return formatBytes(bytes);
  }

  protected isDownloading(id: string): boolean {
    return this.downloadingIds().has(id);
  }

  protected isDeleting(id: string): boolean {
    return this.deletingIds().has(id);
  }

  // Selección y arrastre

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.enqueue(Array.from(input.files ?? []));
    input.value = ''; // así, elegir el mismo archivo otra vez también dispara el evento
  }

  protected onDrag(event: DragEvent): void {
    if (!this.canAttach() || !hasFiles(event)) return;
    event.preventDefault(); // sin esto el navegador no permite soltar
    this.dragging.set(true);
  }

  protected onLeave(event: DragEvent): void {
    const zone = event.currentTarget as HTMLElement;
    if (!zone.contains(event.relatedTarget as Node | null)) {
      this.dragging.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault(); // si no, el navegador abriría el archivo y abandonaría la página
    this.dragging.set(false);
    this.enqueue(Array.from(event.dataTransfer?.files ?? []));
  }

  // Cola de subida

  protected enqueue(files: readonly File[]): void {
    if (!this.canAttach() || files.length === 0) return;

    const { accepted, rejected } = validateBatch(files, this.slotsLeft());
    this.rejections.set(rejected);
    if (accepted.length === 0) return;

    this.queue.update((items) => [
      ...items,
      ...accepted.map((file): UploadItem => ({
        id: this.nextId++,
        file,
        status: 'queued',
        percent: 0,
        error: null,
      })),
    ]);
    this.pump();
  }

  protected cancel(item: UploadItem): void {
    if (this.activeId === item.id) {
      this.subscription?.unsubscribe(); // aborta la subida en curso
      this.activeId = null;
    }
    this.queue.update((items) => items.filter((i) => i.id !== item.id));
    this.announcement.set(`Se canceló ${item.file.name}`);
    this.pump();
  }

  protected retry(item: UploadItem): void {
    this.patch(item.id, { status: 'queued', percent: 0, error: null });
    this.pump();
  }

  /** Sube de uno en uno: un fallo no bloquea al resto. */
  private pump(): void {
    if (this.activeId !== null) return;

    const next = this.queue().find((item) => item.status === 'queued');
    if (!next) {
      this.finishBatch();
      return;
    }

    this.activeId = next.id;
    this.patch(next.id, { status: 'uploading', percent: 0, error: null });
    this.announcement.set(`Subiendo ${next.file.name}`);

    this.subscription = this.api.upload(this.ticketId(), next.file).subscribe({
      next: (event) => {
        if (event.kind === 'progress') {
          this.patch(next.id, { percent: event.percent });
        } else {
          this.queue.update((items) => items.filter((i) => i.id !== next.id));
          this.uploadedInBatch++;
          this.announcement.set(`Se subió ${next.file.name}`);
          this.list.reload();
        }
      },
      error: (error: unknown) => {
        this.activeId = null;
        this.patch(next.id, { status: 'error', error: describeError(error) });
        this.announcement.set(`No se pudo subir ${next.file.name}`);
        if (toApiError(error).code === 'TICKET_LOCKED') {
          this.locked.emit();
        }
        this.pump();
      },
      complete: () => {
        this.activeId = null;
        this.pump();
      },
    });
  }

  private finishBatch(): void {
    if (this.uploadedInBatch > 0) {
      const count = this.uploadedInBatch;
      this.uploadedInBatch = 0;
      this.toast.success(count === 1 ? 'Subiste 1 archivo.' : `Subiste ${count} archivos.`);
    }
  }

  private patch(id: number, changes: Partial<UploadItem>): void {
    this.queue.update((items) =>
      items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  // Descargar y borrar

  protected async download(file: Attachment): Promise<void> {
    if (this.isDownloading(file.id)) return;
    this.mark(this.downloadingIds, file.id, true);
    try {
      const blob = await firstValueFrom(this.api.download(this.ticketId(), file.id));
      this.saver.save(blob, file.filename);
    } catch (error) {
      const gone = toApiError(error).code === 'RESOURCE_NOT_FOUND';
      this.toast.error(gone ? `«${file.filename}» ya no está disponible.` : describeError(error));
      if (gone) {
        this.list.reload();
      }
    } finally {
      this.mark(this.downloadingIds, file.id, false);
    }
  }

  protected async remove(file: Attachment): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: 'Eliminar adjunto',
      message: `Se borrará «${file.filename}» de este ticket y no se podrá recuperar.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!confirmed || this.isDeleting(file.id)) return;

    this.mark(this.deletingIds, file.id, true);
    try {
      await firstValueFrom(this.api.remove(this.ticketId(), file.id));
      this.toast.success(`Eliminaste «${file.filename}».`);
    } catch (error) {
      const code = toApiError(error).code;
      this.toast.error(describeError(error));
      if (code === 'TICKET_LOCKED') {
        this.locked.emit();
      }
    } finally {
      this.mark(this.deletingIds, file.id, false);
      this.list.reload(); // salga como salga, la lista debe reflejar la realidad
    }
  }

  protected reload(): void {
    this.list.reload();
  }

  protected clearRejections(): void {
    this.rejections.set([]);
  }

  private mark(target: WritableSignal<ReadonlySet<string>>, id: string, on: boolean): void {
    target.update((ids) => {
      const next = new Set(ids);
      if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
