import { isUuid, positiveInt } from './list-params';

describe('positiveInt', () => {
  it.each([
    ['3', 1, 3],
    ['20', 7, 20],
    ['0', 1, 1],
    ['-2', 1, 1],
    ['1.5', 1, 1],
    ['abc', 1, 1],
    ['', 5, 5],
    [undefined, 7, 7],
  ])('%j with fallback %i → %i', (value, fallback, expected) => {
    expect(positiveInt(value, fallback)).toBe(expected);
  });
});

describe('isUuid', () => {
  it('accepts a UUID, in either case', () => {
    expect(isUuid('0c9d6e0e-7b1d-4c0a-9f0e-3a6f5f0c1b11')).toBe(true);
    expect(isUuid('0C9D6E0E-7B1D-4C0A-9F0E-3A6F5F0C1B11')).toBe(true);
  });

  it.each(['', 'hola', '0c9d6e0e', '0c9d6e0e-7b1d-4c0a-9f0e-3a6f5f0c1b1', undefined])(
    'rejects %j',
    (value) => {
      expect(isUuid(value)).toBe(false);
    },
  );
});
