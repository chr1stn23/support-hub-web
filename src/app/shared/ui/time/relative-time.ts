const short = new Intl.RelativeTimeFormat('es', { numeric: 'auto', style: 'short' });
const long = new Intl.RelativeTimeFormat('es', { numeric: 'auto', style: 'long' });
const day = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });
const dayWithYear = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const full = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return '';
  }
  const seconds = Math.round((then - now) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 45) return 'ahora';
  if (abs < 3600) return short.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return short.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86_400) return long.format(Math.round(seconds / 86_400), 'day');

  const date = new Date(then);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return (sameYear ? day : dayWithYear).format(date);
}

export function absoluteDateTime(iso: string): string {
  const then = Date.parse(iso);
  return Number.isNaN(then) ? '' : full.format(then);
}
