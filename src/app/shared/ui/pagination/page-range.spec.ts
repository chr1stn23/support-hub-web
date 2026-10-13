import { pageRange, totalPagesOf } from './page-range';

describe('totalPagesOf', () => {
  it.each([
    [0, 20, 1],
    [1, 20, 1],
    [20, 20, 1],
    [21, 20, 2],
    [40, 20, 2],
    [135, 20, 7],
    [135, 0, 1],
  ])('%i elements with size %i → %i pages', (total, size, pages) => {
    expect(totalPagesOf(total, size)).toBe(pages);
  });
});

describe('pageRange', () => {
  it('numbers the first and last element of the page, starting at 1', () => {
    expect(pageRange(0, 20, 135)).toEqual({ from: 1, to: 20 });
    expect(pageRange(1, 20, 135)).toEqual({ from: 21, to: 40 });
  });

  it('shortens the last page', () => {
    expect(pageRange(6, 20, 135)).toEqual({ from: 121, to: 135 });
  });

  it('is 0–0 when there is nothing to show', () => {
    expect(pageRange(0, 20, 0)).toEqual({ from: 0, to: 0 });
  });
});
