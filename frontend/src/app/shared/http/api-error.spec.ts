import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, CONNECTION_ERROR } from './api-error';

const FALLBACK = 'Something went wrong';

function httpError(status: number, error: unknown = null) {
  return new HttpErrorResponse({ status, error });
}

describe('apiErrorMessage', () => {
  it('uses the API message for a business error (4xx)', () => {
    expect(apiErrorMessage(httpError(404, { error: 'Codi no vàlid' }), FALLBACK)).toBe('Codi no vàlid');
    expect(apiErrorMessage(httpError(409, { error: 'Ja formes part d’aquesta campanya' }), FALLBACK)).toBe(
      'Ja formes part d’aquesta campanya',
    );
  });

  it('uses the first field error for a validation error (400)', () => {
    const body = {
      error: 'Dades no vàlides',
      fields: { name: ['El nom ha de tenir com a mínim 3 caràcters'] },
      general: [],
    };

    expect(apiErrorMessage(httpError(400, body), FALLBACK)).toBe('El nom ha de tenir com a mínim 3 caràcters');
  });

  it('explains that the server could not be reached (status 0)', () => {
    expect(apiErrorMessage(httpError(0), FALLBACK)).toBe(CONNECTION_ERROR);
  });

  it('falls back on server errors, bodies without a message and non-HTTP errors', () => {
    expect(apiErrorMessage(httpError(500, { error: 'Error intern del servidor' }), FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(httpError(403, 'Forbidden'), FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(httpError(400, { error: 'Dades no vàlides', fields: {} }), FALLBACK)).toBe(FALLBACK);
    expect(apiErrorMessage(new Error('boom'), FALLBACK)).toBe(FALLBACK);
  });
});