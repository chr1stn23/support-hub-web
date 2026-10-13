export interface PageRange {
  readonly from: number;
  readonly to: number;
}

export function totalPagesOf(totalElements: number, size: number): number {
  return size > 0 ? Math.max(1, Math.ceil(totalElements / size)) : 1;
}

/** "Mostrando 21–40": los números (desde 1) del primer y el último elemento de la página. */
export function pageRange(page: number, size: number, totalElements: number): PageRange {
  if (totalElements <= 0) {
    return { from: 0, to: 0 };
  }
  return {
    from: Math.min(page * size + 1, totalElements),
    to: Math.min((page + 1) * size, totalElements),
  };
}
