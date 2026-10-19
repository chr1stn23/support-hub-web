import { buildTrendChart, dayLabel, niceMax, yTicks } from './dashboard-chart';

const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;

describe('dayLabel', () => {
  it('shows the day and the month, without converting the time zone', () => {
    expect(dayLabel('2026-10-08')).toMatch(/^8 oct\.?$/);
    expect(dayLabel('2026-01-01')).toMatch(/^1 ene\.?$/);
  });
});

describe('niceMax', () => {
  it.each([
    [0, 4],
    [1, 4],
    [4, 4],
    [5, 5],
    [7, 8],
    [9, 10],
    [11, 15],
    [13, 15],
    [31, 40],
    [87, 100],
    [101, 150],
  ])('%i → %i', (value, expected) => {
    expect(niceMax(value)).toBe(expected);
  });

  it('is never lower than the value it has to hold', () => {
    for (let value = 0; value <= 2000; value++) {
      expect(niceMax(value)).toBeGreaterThanOrEqual(value);
    }
  });
});

describe('yTicks', () => {
  it('counts one by one when the top is small', () => {
    expect(yTicks(4)).toEqual([0, 1, 2, 3, 4]);
  });

  it.each([5, 6, 8, 10, 15, 20, 40, 100, 150])(
    'only has whole numbers for the top %i, from 0 to the top',
    (top) => {
      const ticks = yTicks(top);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBe(top);
      expect(ticks.every((tick) => Number.isInteger(tick))).toBe(true);
    },
  );

  it('spaces them evenly', () => {
    expect(yTicks(8)).toEqual([0, 2, 4, 6, 8]);
    expect(yTicks(6)).toEqual([0, 2, 4, 6]);
  });
});

describe('buildTrendChart', () => {
  const size = { width: 100, height: 60, left: 10, right: 10, top: 10, bottom: 10 }; // el área de dibujo: 80 × 40

  it('puts the first day on the left, the last on the right, and the highest value at the top', () => {
    const chart = buildTrendChart(
      [
        { day: day(1), created: 2, resolved: 0 },
        { day: day(2), created: 4, resolved: 2 },
      ],
      size,
    );

    expect(chart.max).toBe(4);
    expect(chart.created).toBe('10,30 90,10'); // 2 a media altura; 4, arriba del todo
    expect(chart.resolved).toBe('10,50 90,30'); // 0 sobre el eje; 2 a media altura
  });

  it('totals what was created and resolved', () => {
    const chart = buildTrendChart(
      [
        { day: day(1), created: 2, resolved: 1 },
        { day: day(2), created: 3, resolved: 0 },
      ],
      size,
    );
    expect(chart.totalCreated).toBe(5);
    expect(chart.totalResolved).toBe(1);
    expect(chart.empty).toBe(false);
  });

  it('is empty when nothing happened, instead of drawing a flat line', () => {
    const chart = buildTrendChart(
      [
        { day: day(1), created: 0, resolved: 0 },
        { day: day(2), created: 0, resolved: 0 },
      ],
      size,
    );
    expect(chart.empty).toBe(true);
    expect(chart.max).toBe(4);
  });

  it('puts the marks of the vertical axis at their height', () => {
    const chart = buildTrendChart(
      [
        { day: day(1), created: 4, resolved: 0 },
        { day: day(2), created: 0, resolved: 0 },
      ],
      size,
    );
    expect(chart.yTicks).toEqual([
      { value: 0, y: 50 },
      { value: 1, y: 40 },
      { value: 2, y: 30 },
      { value: 3, y: 20 },
      { value: 4, y: 10 },
    ]);
  });

  it('copes with a single day, drawing it in the middle', () => {
    const chart = buildTrendChart([{ day: day(1), created: 4, resolved: 4 }], size);
    expect(chart.created).toBe('50,10');
    expect(chart.xTicks).toHaveLength(1);
  });

  it('copes with no days at all', () => {
    const chart = buildTrendChart([], size);
    expect(chart.created).toBe('');
    expect(chart.xTicks).toEqual([]);
    expect(chart.empty).toBe(true);
  });

  describe('the dates on the horizontal axis', () => {
    const points = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        day: `2026-09-${String(i + 1).padStart(2, '0')}`,
        created: 1,
        resolved: 0,
      }));

    it('shows about six, evenly spread, including the first and the last when 31 points fit', () => {
      const chart = buildTrendChart(points(31));
      expect(chart.xTicks).toHaveLength(6);
      expect(chart.xTicks[0].label).toMatch(/^1 sep\.?$/);
      expect(chart.xTicks[5].label).toMatch(/^31 sep\.?$/);
    });

    it('never shows more than seven, however long the period is', () => {
      expect(buildTrendChart(points(91)).xTicks.length).toBeLessThanOrEqual(7);
      expect(buildTrendChart(points(8)).xTicks.length).toBeLessThanOrEqual(7);
    });

    it('keeps them in order, from left to right', () => {
      const xs = buildTrendChart(points(31)).xTicks.map((tick) => tick.x);
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    });
  });
});
