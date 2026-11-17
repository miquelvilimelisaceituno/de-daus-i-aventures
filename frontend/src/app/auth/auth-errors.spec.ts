import { authErrorMessage, GENERIC_AUTH_ERROR } from './auth-errors';

describe('authErrorMessage', () => {
  it('no diu si falla l’email o la contrasenya (HU-02)', () => {
    for (const code of ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password']) {
      expect(authErrorMessage({ code })).toBe('Email o contrasenya incorrectes');
    }
  });

  it('tradueix els errors del registre', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toBe(
      'Ja hi ha un compte amb aquest email',
    );
    expect(authErrorMessage({ code: 'auth/weak-password' })).toBe(
      'La contrasenya ha de tenir almenys 6 caràcters',
    );
  });

  it('dona un missatge genèric per a codis desconeguts o errors sense codi', () => {
    expect(authErrorMessage({ code: 'auth/una-cosa-nova' })).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage(new Error('boom'))).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage(null)).toBe(GENERIC_AUTH_ERROR);
  });
});