import { authErrorMessage, GENERIC_AUTH_ERROR } from './auth-errors';

describe('authErrorMessage', () => {
  it('does not reveal whether the email or the password is wrong (HU-02)', () => {
    for (const code of ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password']) {
      expect(authErrorMessage({ code })).toBe('Email o contrasenya incorrectes');
    }
  });

  it('translates the sign-up errors', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toBe(
      'Ja hi ha un compte amb aquest email',
    );
    expect(authErrorMessage({ code: 'auth/weak-password' })).toBe(
      'La contrasenya ha de tenir almenys 6 caràcters',
    );
  });

  it('gives a generic message for unknown codes or errors without a code', () => {
    expect(authErrorMessage({ code: 'auth/una-cosa-nova' })).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage(new Error('boom'))).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage(null)).toBe(GENERIC_AUTH_ERROR);
  });
});