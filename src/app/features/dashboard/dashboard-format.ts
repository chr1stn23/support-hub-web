const counts = new Intl.NumberFormat('es-PE');
const decimals = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });

export const PERIOD_OPTIONS: readonly { readonly days: number; readonly label: string }[] = [
  { days: 7, label: 'Últimos 7 días' },
  { days: 30, label: 'Últimos 30 días' },
  { days: 90, label: 'Últimos 90 días' },
];
export const DEFAULT_DAYS = 30;

/** El período de la URL, o 30 si no es uno de los que se ofrecen. */
export function parseDays(value: string | undefined): number {
  const days = Number(value);
  return PERIOD_OPTIONS.some((option) => option.days === days) ? days : DEFAULT_DAYS;
}

/** Solo viaja en la URL si no es el período por defecto. */
export function toDashboardUrlParams(days: number): Record<string, string> {
  return days === DEFAULT_DAYS ? {} : { dias: String(days) };
}

export function formatCount(value: number): string {
  return counts.format(value);
}

/** 0,5 h → "30 min"; 5,2 → "5,2 h"; 72 → "3 días"; sin dato → "—". */
export function formatDuration(hours: number | null): string {
  if (hours === null || Number.isNaN(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${decimals.format(hours)} h`;
  return `${decimals.format(hours / 24)} días`;
}

/** El ancho de una barra: 0 si no hay nada con qué comparar. */
export function percentOf(value: number, max: number): number {
  return max <= 0 ? 0 : Math.round((value / max) * 100);
}
