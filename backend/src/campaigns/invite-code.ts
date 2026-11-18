import { randomInt } from 'node:crypto';

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