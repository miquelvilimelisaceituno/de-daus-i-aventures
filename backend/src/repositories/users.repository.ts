import { prisma } from '../db/prisma';
import type { Db } from '../db/types';

// Accés a la taula users. Només Prisma: cap regla de negoci.
// Cada funció accepta `db` (per defecte, prisma) per poder-se fer servir dins d'una transacció.

// Llista blanca de camps del perfil que surten de l'API (D33).
const PROFILE_SELECT = { id: true, name: true, avatarUrl: true, isAdmin: true } as const;

export function findProfile(id: string, db: Db = prisma) {
  return db.user.findUnique({ where: { id }, select: PROFILE_SELECT });
}

export async function exists(id: string, db: Db = prisma) {
  return (await db.user.findUnique({ where: { id }, select: { id: true } })) !== null;
}

/** Crea el perfil si no existeix; si ja existeix, el retorna sense canviar-lo. */
export function createIfMissing(id: string, name: string, db: Db = prisma) {
  return db.user.upsert({ where: { id }, create: { id, name }, update: {}, select: PROFILE_SELECT });
}

/** Actualitza el perfil. Prisma llança P2025 si no existeix. */
export function updateProfile(id: string, data: { name?: string; avatarUrl?: string | null }, db: Db = prisma) {
  return db.user.update({ where: { id }, data, select: PROFILE_SELECT });
}