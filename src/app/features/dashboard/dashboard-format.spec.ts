import {
  DEFAULT_DAYS,
  PERIOD_OPTIONS,
  formatCount,
  formatDuration,
  parseDays,
  percentOf,
  toDashboardUrlParams,
} from './dashboard-format';

describe('parseDays', () => {
  it.each(['7', '30', '90'])('accepts the period %s', (value) => {
    expect(parseDays(value)).toBe(Number(value));
  });

  it.each(['abc', '0', '-7', '365', '15', '7.5', '', undefined])(
    'falls back to the default for %j',
    (value) => {
      expect(parseDays(value)).toBe(DEFAULT_DAYS);
    },
  );

  it('offers the three periods', () => {
    expect(PERIOD_OPTIONS.map((option) => option.days)).toEqual([7, 30, 90]);
  });
});

describe('toDashboardUrlParams', () => {
  it('writes the period only when it is not the default', () => {
    expect(toDashboardUrlParams(30)).toEqual({});
    expect(toDashboardUrlParams(7)).toEqual({ dias: '7' });
    expect(toDashboardUrlParams(90)).toEqual({ dias: '90' });
  });
});

describe('formatDuration', () => {
  it('says "—" when there is no data', () => {
    expect(formatDuration(null)).toBe('—');
  });

  it('uses minutes under an hour, hours under two days and days after that', () => {
    expect(formatDuration(0.5)).toBe('30 min');
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(5.2)).toMatch(/^5[.,]2 h$/);
    expect(formatDuration(47)).toBe('47 h');
    expect(formatDuration(72)).toBe('3 días');
    expect(formatDuration(60)).toMatch(/^2[.,]5 días$/);
  });
});

describe('formatCount and percentOf', () => {
  it('separates the thousands', () => {
    expect(formatCount(1234)).toMatch(/^1[,.\s]234$/);
    expect(formatCount(7)).toBe('7');
  });

  it('scales a bar against the biggest value, and copes with nothing to compare', () => {
    expect(percentOf(5, 10)).toBe(50);
    expect(percentOf(10, 10)).toBe(100);
    expect(percentOf(0, 10)).toBe(0);
    expect(percentOf(3, 0)).toBe(0);
  });
});
