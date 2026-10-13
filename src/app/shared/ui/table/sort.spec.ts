import { nextSort, parseSort, toSortParam } from './sort';

describe('parseSort', () => {
  it('reads the backend format', () => {
    expect(parseSort('createdAt,desc')).toEqual({ property: 'createdAt', direction: 'desc' });
    expect(parseSort('title,asc')).toEqual({ property: 'title', direction: 'asc' });
  });

  it('defaults to ascending', () => {
    expect(parseSort('title')).toEqual({ property: 'title', direction: 'asc' });
  });

  it('rejects nothing and garbage', () => {
    expect(parseSort(null)).toBeNull();
    expect(parseSort('')).toBeNull();
    expect(parseSort(',desc')).toBeNull();
  });
});

describe('toSortParam', () => {
  it('round-trips with parseSort', () => {
    const sort = { property: 'priority', direction: 'desc' as const };
    expect(parseSort(toSortParam(sort))).toEqual(sort);
    expect(toSortParam(sort)).toBe('priority,desc');
  });
});

describe('nextSort', () => {
  it('starts a new column in its first direction', () => {
    expect(nextSort(null, 'title')).toEqual({ property: 'title', direction: 'asc' });
    expect(nextSort({ property: 'title', direction: 'asc' }, 'priority', 'desc')).toEqual({
      property: 'priority',
      direction: 'desc',
    });
  });

  it('toggles the direction of the active column', () => {
    expect(nextSort({ property: 'title', direction: 'asc' }, 'title').direction).toBe('desc');
    expect(nextSort({ property: 'title', direction: 'desc' }, 'title').direction).toBe('asc');
  });

  it('ignores the first direction once the column is active', () => {
    expect(nextSort({ property: 'age', direction: 'desc' }, 'age', 'desc').direction).toBe('asc');
  });
});
