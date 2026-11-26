import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('accepts internal routes', () => {
    expect(safeReturnUrl('/c/123/diari')).toBe('/c/123/diari');
  });

  it('without an address, goes to /campanyes', () => {
    expect(safeReturnUrl(undefined)).toBe('/campanyes');
    expect(safeReturnUrl('')).toBe('/campanyes');
  });

  it('rejects external addresses (open redirect)', () => {
    for (const url of ['https://web-falsa.com', '//web-falsa.com', '/\\web-falsa.com', 'javascript:alert(1)']) {
      expect(safeReturnUrl(url)).toBe('/campanyes');
    }
  });
});