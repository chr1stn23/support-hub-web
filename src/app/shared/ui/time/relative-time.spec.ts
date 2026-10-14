import { absoluteDateTime, relativeTime } from '@shared/ui';

const NOW = Date.parse('2026-10-14T15:00:00-05:00');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('relativeTime', () => {
  it('says "ahora" for the last seconds', () => {
    expect(relativeTime(ago(10_000), NOW)).toBe('ahora');
  });

  it('counts minutes and hours', () => {
    expect(relativeTime(ago(5 * MIN), NOW)).toMatch(/hace 5 min/);
    expect(relativeTime(ago(2 * HOUR), NOW)).toMatch(/hace 2 h/);
  });

  it('says "ayer" and counts days up to a week', () => {
    expect(relativeTime(ago(DAY), NOW)).toBe('ayer');
    expect(relativeTime(ago(3 * DAY), NOW)).toMatch(/hace 3 días/);
  });

  it('shows the date, without the year, from a week on', () => {
    const text = relativeTime(ago(14 * DAY), NOW);
    expect(text).toMatch(/30/);
    expect(text).not.toMatch(/2026/);
  });

  it('adds the year when it is not the current one', () => {
    expect(relativeTime(ago(400 * DAY), NOW)).toMatch(/2025/);
  });

  it('also copes with the future', () => {
    expect(relativeTime(new Date(NOW + 5 * MIN).toISOString(), NOW)).toMatch(
      /en 5 min|dentro de 5 min/,
    );
  });

  it('returns nothing for a value that is not a date', () => {
    expect(relativeTime('no es una fecha', NOW)).toBe('');
  });
});

describe('absoluteDateTime', () => {
  it('gives the exact moment, with the year', () => {
    expect(absoluteDateTime('2026-10-08T19:32:00Z')).toMatch(/2026/);
  });

  it('returns nothing for a value that is not a date', () => {
    expect(absoluteDateTime('nada')).toBe('');
  });
});
