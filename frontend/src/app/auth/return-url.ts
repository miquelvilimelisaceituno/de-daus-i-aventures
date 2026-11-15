const DEFAULT_URL = '/campanyes';

/**
 * Adreça on anar després del login. Només s'accepten rutes internes ("/c/123"):
 * una adreça externa ("https://...", "//...") permetria enviar l'usuari a una web falsa
 * amb un enllaç del tipus /login?returnUrl=https://web-falsa.com (open redirect).
 */
export function safeReturnUrl(url: string | null | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return DEFAULT_URL;
  }
  return url;
}