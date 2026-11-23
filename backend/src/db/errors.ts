import { Prisma } from '../generated/prisma/client';

// Errors de la BD amb nom propi, perquè els serveis no hagin de conèixer els codis de Prisma.

function hasCode(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

/** P2002: un valor que ha de ser únic ja existeix (per exemple, un codi d'invitació). */
export const isUniqueViolation = (err: unknown) => hasCode(err, 'P2002');

/** P2003: una clau forana apunta a una fila que no existeix (per exemple, un usuari sense perfil). */
export const isForeignKeyViolation = (err: unknown) => hasCode(err, 'P2003');

/** P2025: l'operació necessitava una fila que no existeix. */
export const isRecordNotFound = (err: unknown) => hasCode(err, 'P2025');