import type { Auth } from 'firebase-admin/auth';
import { env } from '../config/env';

/** Qui és l'usuari, segons el token. Res sobre què pot fer (D9). */
export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
}

type VerifyToken = (token: string) => Promise<AuthUser>;

// D21: amb NODE_ENV=test s'accepten tokens "test:<uid>", sense xarxa ni Firebase.
const verifyTestToken: VerifyToken = async (token) => {
  const match = /^test:([\w-]{1,128})$/.exec(token);
  if (!match) throw new Error('Token de test no vàlid');
  const uid = match[1];
  return { uid, email: `${uid}@test.local` };
};

// firebase-admin es carrega amb import() dinàmic i només fora dels tests:
// en mode test no cal (D21), i Jest no pot carregar algunes de les seves
// dependències, que són ES Modules (jose).
async function loadFirebaseAuth(): Promise<Auth> {
  const { cert, getApps, initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
      }),
    });
  return getAuth(app);
}

// Fora dels tests: firebase-admin comprova la signatura, el projecte i la caducitat.
function createFirebaseVerifier(): VerifyToken {
// Es comença a carregar en arrencar el servidor, no a la primera petició:
  // si les credencials no són vàlides, el servidor s'atura de seguida amb l'error.
  const authReady = loadFirebaseAuth();

  return async (token) => {
    const auth = await authReady;
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  };
}

export const verifyToken: VerifyToken =
  env.NODE_ENV === 'test' ? verifyTestToken : createFirebaseVerifier();