import type { DayPoint } from '@core/api/models';

export interface ChartSize {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export const TREND_SIZE: ChartSize = {
  width: 640,
  height: 240,
  left: 36,
  right: 12,
  top: 12,
  bottom: 28,
};

const MONTH_NAMES = [
  'ene.',
  'feb.',
  'mar.',
  'abr.',
  'may.',
  'jun.',
  'jul.',
  'ago.',
  'sep.',
  'oct.',
  'nov.',
  'dic.',
];

/** "2026-10-08" → "8 oct.". Formato estándar independiente del locale del sistema. */
export function dayLabel(isoDay: string): string {
  const [, monthStr, dayStr] = isoDay.split('-');
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const monthName = MONTH_NAMES[month - 1] ?? '';
  return `${day} ${monthName}`;
}

/** El tope del eje: el menor valor "redondo" que alcanza (7 → 8, 13 → 15, 87 → 100). Nunca menos de 4. */
export function niceMax(max: number): number {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = [1, 1.5, 2, 3, 4, 5, 6, 8, 10].find((n) => normalized <= n) ?? 10;
  return step * magnitude;
}

/** Las marcas del eje vertical, siempre en números enteros. */
export function yTicks(top: number): number[] {
  if (top <= 4) return Array.from({ length: top + 1 }, (_, i) => i);
  const intervals = [4, 5, 3, 2].find((n) => top % n === 0) ?? 1;
  const step = top / intervals;
  return Array.from({ length: intervals + 1 }, (_, i) => i * step);
}

export interface TrendChart {
  readonly width: number;
  readonly height: number;
  readonly plot: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  readonly max: number;
  readonly yTicks: readonly { readonly value: number; readonly y: number }[];
  readonly xTicks: readonly { readonly label: string; readonly x: number }[];
  /** Los puntos de cada línea, listos para el atributo `points` de un <polyline>. */
  readonly created: string;
  readonly resolved: string;
  readonly totalCreated: number;
  readonly totalResolved: number;
  /** Ningún ticket creado ni resuelto en todo el período. */
  readonly empty: boolean;
}

const round = (value: number): number => Number(value.toFixed(1));

export function buildTrendChart(
  points: readonly DayPoint[],
  size: ChartSize = TREND_SIZE,
): TrendChart {
  const plot = {
    left: size.left,
    right: size.width - size.right,
    top: size.top,
    bottom: size.height - size.bottom,
  };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;

  const highest = Math.max(0, ...points.flatMap((p) => [p.created, p.resolved]));
  const max = niceMax(highest);

  const xAt = (index: number): number =>
    points.length <= 1
      ? plot.left + plotWidth / 2
      : plot.left + (index / (points.length - 1)) * plotWidth;
  const yAt = (value: number): number => plot.bottom - (value / max) * plotHeight;
  const line = (pick: (p: DayPoint) => number): string =>
    points.map((p, i) => `${round(xAt(i))},${round(yAt(pick(p)))}`).join(' ');

  // Unas seis fechas repartidas por el eje, sin que se pisen
  const step = Math.max(1, Math.ceil((points.length - 1) / 5));
  const indexes = points.map((_, i) => i).filter((i) => i % step === 0);
  const lastRegular = indexes[indexes.length - 1] ?? 0;
  if (points.length > 0 && points.length - 1 - lastRegular >= step / 2) {
    indexes.push(points.length - 1);
  }

  const totalCreated = points.reduce((sum, p) => sum + p.created, 0);
  const totalResolved = points.reduce((sum, p) => sum + p.resolved, 0);

  return {
    width: size.width,
    height: size.height,
    plot,
    max,
    yTicks: yTicks(max).map((value) => ({ value, y: round(yAt(value)) })),
    xTicks: indexes.map((i) => ({ label: dayLabel(points[i].day), x: round(xAt(i)) })),
    created: line((p) => p.created),
    resolved: line((p) => p.resolved),
    totalCreated,
    totalResolved,
    empty: totalCreated === 0 && totalResolved === 0,
  };
}
