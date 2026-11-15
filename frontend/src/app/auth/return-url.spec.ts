import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('accepta rutes internes', () => {
    expect(safeReturnUrl('/c/123/diari')).toBe('/c/123/diari');
  });

  it('sense adreça, va a /campanyes', () => {
    expect(safeReturnUrl(undefined)).toBe('/campanyes');
    expect(safeReturnUrl('')).toBe('/campanyes');
  });

  it('rebutja adreces externes (open redirect)', () => {
    for (const url of ['https://web-falsa.com', '//web-falsa.com', '/\\web-falsa.com', 'javascript:alert(1)']) {
      expect(safeReturnUrl(url)).toBe('/campanyes');
    }
  });
});