import { safeReturnUrl } from './return-url'

describe('safeReturnUrl', () => {
  it.each([
    '/tickets',
    '/tickets?status=OPEN&page=2',
    '/tickets/3f0c2c9e-1111-2222-3333-444455556666',
    '/activos#detalle',
  ])('accepts the internal route %s', (url) => {
    expect(safeReturnUrl(url)).toBe(url);
  });

  it.each([
    ['//evil.example.com'],
    ['//evil.example.com/path'],
    ['/\\evil.example.com'],
    ['https://evil.example.com'],
    ['http://evil.example.com'],
    ['javascript:alert(1)'],
    ['tickets'],
    ['/tickets\nSet-Cookie: x=1'],
    [''],
  ])('rejects %j', (url) => {
    expect(safeReturnUrl(url)).toBe('/resumen');
  });

  it('copes with a missing value', () => {
    expect(safeReturnUrl(null)).toBe('/resumen');
    expect(safeReturnUrl(undefined)).toBe('/resumen');
  });

  it('never bounces back to the login', () => {
    expect(safeReturnUrl('/login')).toBe('/resumen');
    expect(safeReturnUrl('/login?returnUrl=%2Ftickets')).toBe('/resumen');
  });

  it('accepts a custom fallback', () => {
    expect(safeReturnUrl('//evil.example.com', '/tickets')).toBe('/tickets');
  });
});
