import { IconName } from '@shared/ui';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_TICKET = 10;
export const ALLOWED_EXTENSIONS: readonly string[] = ['png', 'jpg', 'jpeg', 'pdf', 'txt', 'log'];

/** Para el selector de archivos del navegador: ayuda, pero no impide elegir otros. */
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',');
export const LIMITS_HINT = `Hasta ${MAX_FILES_PER_TICKET} archivos de 5 MB. Formatos: PNG, JPG, PDF y texto (.txt, .log).`;

const numbers = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${numbers.format(bytes / 1024)} KB`;
  return `${numbers.format(bytes / (1024 * 1024))} MB`;
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot < 0 || dot === filename.length - 1 ? '' : filename.slice(dot + 1).toLowerCase();
}

export interface FileLike {
  readonly name: string;
  readonly size: number;
}

/**
 * Comprobación previa para no subir lo que seguro será rechazado. NO es una medida de seguridad:
 * el backend valida el contenido real del archivo, no su nombre.
 */
export function validateFile(file: FileLike, slotsLeft: number): string | null {
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
    return `«${file.name}» no es un formato permitido. Usa PNG, JPG, PDF o texto (.txt, .log).`;
  }
  if (file.size === 0) {
    return `«${file.name}» está vacío.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `«${file.name}» pesa ${formatBytes(file.size)} y el máximo es 5 MB.`;
  }
  if (slotsLeft <= 0) {
    return `No hay espacio para «${file.name}»: el ticket ya tiene el máximo de ${MAX_FILES_PER_TICKET} adjuntos.`;
  }
  return null;
}

/** Valida varios archivos a la vez, descontando el cupo a medida que se aceptan. */
export function validateBatch<T extends FileLike>(
  files: readonly T[],
  slotsLeft: number,
): { accepted: T[]; rejected: string[] } {
  const accepted: T[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    const problem = validateFile(file, slotsLeft - accepted.length);
    if (problem) {
      rejected.push(problem);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

export function fileKind(contentType: string): { icon: IconName; label: string } {
  if (contentType.startsWith('image/')) return { icon: 'image', label: 'Imagen' };
  if (contentType === 'application/pdf') return { icon: 'file', label: 'PDF' };
  if (contentType.startsWith('text/')) return { icon: 'file-text', label: 'Texto' };
  return { icon: 'file', label: 'Archivo' };
}
