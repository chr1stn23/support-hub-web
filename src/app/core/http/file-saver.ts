import { Service } from '@angular/core';

/** Entrega un archivo al navegador como una descarga con ese nombre. Nunca lo abre dentro de la página. */
@Service()
export class FileSaver {
  save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    // Se libera un poco después: algunos navegadores todavía están leyendo la URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
