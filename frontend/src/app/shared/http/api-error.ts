import { HttpErrorResponse } from '@angular/common/http';

export const CONNECTION_ERROR =
  'No s’ha pogut connectar amb el servidor. Comprova la connexió i torna-ho a provar';

/**
 * Converteix un error d'una petició a la nostra API en un missatge per a l'usuari.
 * - Sense connexió (status 0) → CONNECTION_ERROR.
 * - 400 → el primer error de camp de { error, fields, general } (D44).
 * - Altres 4xx → el missatge de l'API ({ error }), que ja és per a l'usuari (MVP §5.1).
 * - 5xx o qualsevol altra cosa → `fallback`.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return CONNECTION_ERROR;
  if (error.status < 400 || error.status >= 500) return fallback;

  const body = error.error as ApiErrorBody | null;
  if (error.status === 400) {
    const firstField = Object.values(body?.fields ?? {}).flat()[0];
    return firstField ?? body?.general?.[0] ?? fallback;
  }
  return typeof body?.error === 'string' ? body.error : fallback;
}

interface ApiErrorBody {
  error?: unknown;
  fields?: Record<string, string[] | undefined>;
  general?: string[];
}