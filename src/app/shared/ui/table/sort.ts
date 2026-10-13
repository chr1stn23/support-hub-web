export type SortDirection = 'asc' | 'desc';

export interface SortState {
  readonly property: string;
  readonly direction: SortDirection;
}

/** "createdAt,desc" → { property: 'createdAt', direction: 'desc' }. Sin dirección, asc. */
export function parseSort(value: string | null | undefined): SortState | null {
  if (!value) {
    return null;
  }
  const [property, direction] = value.split(',');
  return property ? { property, direction: direction === 'desc' ? 'desc' : 'asc' } : null;
}

/** El formato que espera el backend: "propiedad,dirección". */
export function toSortParam(sort: SortState): string {
  return `${sort.property},${sort.direction}`;
}

/** Clic en una cabecera: otra columna empieza en su dirección inicial; la misma, alterna. */
export function nextSort(
  current: SortState | null,
  property: string,
  first: SortDirection = 'asc',
): SortState {
  if (current?.property === property) {
    return { property, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { property, direction: first };
}
