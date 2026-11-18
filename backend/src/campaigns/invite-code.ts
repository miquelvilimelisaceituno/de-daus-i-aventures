import { randomInt } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';

// Sense 0/O, 1/I/L: el codi es dicta i es copia a mà.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

/** Codi d'invitació de 8 caràcters (MVP §5.1). randomInt fa servir l'atzar criptogràfic. */
export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

// Intents per si el codi generat ja existeix (31^8 combinacions: gairebé impossible).
const MAX_CODE_ATTEMPTS = 5;

/**
 * Executa `write` amb un codi nou. Si la BD diu que el codi ja existeix (P2002),
 * ho torna a provar amb un altre. `write` només ha de poder fallar per P2002 a causa del codi.
 * El generador es pot substituir als tests per provar els reintents.
 */
export async function withFreshInviteCode<T>(
  write: (code: string) => Promise<T>,
  generateCode: () => string = generateInviteCode,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await write(generateCode());
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
      throw err;
    }
  }
  throw new Error("No s'ha pogut generar un codi d'invitació únic");
}