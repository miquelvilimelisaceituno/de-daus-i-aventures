// Missatges per als errors de Firebase Auth que pot veure l'usuari al login i al registre.
const WRONG_CREDENTIALS = 'Email o contrasenya incorrectes';

const MESSAGES: Record<string, string> = {
  // HU-02: no es diu si falla l'email o la contrasenya.
  'auth/invalid-credential': WRONG_CREDENTIALS,
  'auth/user-not-found': WRONG_CREDENTIALS,
  'auth/wrong-password': WRONG_CREDENTIALS,
  'auth/invalid-email': 'L’email no té un format vàlid',
  'auth/email-already-in-use': 'Ja hi ha un compte amb aquest email',
  'auth/weak-password': 'La contrasenya ha de tenir almenys 6 caràcters',
  'auth/too-many-requests': 'Massa intents. Torna-ho a provar d’aquí a uns minuts',
  'auth/network-request-failed': 'No hi ha connexió. Comprova la xarxa i torna-ho a provar',
  'auth/user-disabled': 'Aquest compte està desactivat',
};

export const GENERIC_AUTH_ERROR = 'No s’ha pogut completar. Torna-ho a provar';

/** Converteix un error de Firebase Auth en un missatge per a l'usuari. */
export function authErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : '';
  return MESSAGES[code] ?? GENERIC_AUTH_ERROR;
}