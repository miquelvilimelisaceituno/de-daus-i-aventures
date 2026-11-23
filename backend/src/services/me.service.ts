import type { AuthUser } from '../auth/verify-token';
import { isRecordNotFound } from '../db/errors';
import * as usersRepository from '../repositories/users.repository';
import type { UpdateProfile } from '../schemas/me.schemas';
import { ProfileNotFoundError } from './errors';

// Lògica del perfil (F0). No sap res d'Express: rep dades i llança HttpError.

// Si el registre no envia nom: el de Firebase o la part de l'email abans de l'@.
function defaultName(auth: AuthUser): string {
  const name = auth.name ?? auth.email?.split('@')[0] ?? 'Aventurer';
  return name.trim().slice(0, 40) || 'Aventurer';
}

/** Primer login: crea el perfil. Si ja existeix, el retorna igual (D44). */
export function ensureProfile(auth: AuthUser, name?: string) {
  return usersRepository.createIfMissing(auth.uid, name ?? defaultName(auth));
}

export async function getProfile(userId: string) {
  const profile = await usersRepository.findProfile(userId);
  if (!profile) throw new ProfileNotFoundError();
  return profile;
}

export async function updateProfile(userId: string, data: UpdateProfile) {
  try {
    return await usersRepository.updateProfile(userId, data);
  } catch (err) {
    // No existeix cap fila amb aquest id.
    if (isRecordNotFound(err)) {
      throw new ProfileNotFoundError();
    }
    throw err;
  }
}