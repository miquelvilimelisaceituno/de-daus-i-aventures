import { Provider } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { environment } from '../../environments/environment';
import { AUTH_GATEWAY, type AuthGateway, type AuthUserInfo } from './auth-gateway';

/** Converteix l'usuari de Firebase en el mínim que fa servir l'app. */
function toUserInfo(user: User | null): AuthUserInfo | null {
  return user ? { uid: user.uid, email: user.email } : null;
}

/** Implementació del contracte amb l'SDK de Firebase. */
function createFirebaseGateway(): AuthGateway {
  const auth = getAuth(initializeApp(environment.firebase));

  return {
    onAuthStateChanged: (callback) =>
      firebaseOnAuthStateChanged(auth, (user) => callback(toUserInfo(user))),

    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },

    register: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },

    signOut: () => firebaseSignOut(auth),

    getIdToken: async () => {
      // En recarregar la pàgina, Firebase restaura la sessió desada de manera asíncrona:
      // sense esperar, les primeres peticions sortirien sense token (401).
      await auth.authStateReady();
      return auth.currentUser ? auth.currentUser.getIdToken() : null;
    },
  };
}

/** Connecta l'app amb Firebase Auth. Només s'ha de fer servir a app.config.ts. */
export function provideFirebaseAuth(): Provider {
  return { provide: AUTH_GATEWAY, useFactory: createFirebaseGateway };
}
