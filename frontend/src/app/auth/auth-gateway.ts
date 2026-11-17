import { InjectionToken } from '@angular/core';

/** El mínim que l'app necessita saber de l'usuari autenticat. */
export interface AuthUserInfo {
  uid: string;
  email: string | null;
}

/**
 * Contracte de l'autenticació: què necessita l'app, sense saber qui ho fa.
 * Aquest fitxer no ha d'importar mai Firebase (D9: Firebase només identifica).
 */
export interface AuthGateway {
  /** Avisa cada cop que canvia l'usuari (també una vegada en arrencar). Retorna la funció per deixar d'escoltar. */
  onAuthStateChanged(callback: (user: AuthUserInfo | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Token per a l'API, o null si no hi ha sessió. */
  getIdToken(): Promise<string | null>;
}

/** Clau d'injecció: una interfície desapareix en compilar i Angular no la pot fer servir. */
export const AUTH_GATEWAY = new InjectionToken<AuthGateway>('AUTH_GATEWAY');
