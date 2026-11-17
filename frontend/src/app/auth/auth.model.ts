// Perfil tal com el retorna /api/me (PROFILE_SELECT de backend/src/routes/me.ts).
export interface Profile {
  id: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

/**
 * Estat de la sessió:
 * - `loading`: encara no se sap (arrencada, login en curs o perfil carregant-se).
 * - `signedOut`: no hi ha cap usuari.
 * - `signedIn`: Firebase ha identificat l'usuari i s'ha intentat carregar el perfil.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';