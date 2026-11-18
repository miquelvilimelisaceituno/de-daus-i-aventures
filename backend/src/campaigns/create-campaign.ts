import { prisma } from '../db/prisma';
import { Prisma } from '../generated/prisma/client';
import { CAMPAIGN_SELECT } from './campaign-view';
import { generateInviteCode } from './invite-code';

export interface NewCampaign {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

/** L'usuari no té perfil: POST /api/me no s'ha cridat. */
export class ProfileNotFoundError extends Error {}

// Intents per si el codi generat ja existeix (31^8 combinacions: gairebé impossible).
const MAX_CODE_ATTEMPTS = 5;

/**
 * Crea la campanya amb l'usuari com a màster (HU-10).
 * El generador de codis es pot substituir als tests per provar els reintents.
 */
export async function createCampaign(
  userId: string,
  data: NewCampaign,
  generateCode: () => string = generateInviteCode,
) {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    try {
      // Escriptura niuada: campanya i pertinença en una sola transacció.
      // Si falla la pertinença, la campanya tampoc es crea.
      return await prisma.campaign.create({
        data: {
          ...data,
          inviteCode: generateCode(),
          memberships: { create: { userId, role: 'master' } },
        },
        select: CAMPAIGN_SELECT,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: en una campanya nova, l'únic valor que es pot repetir és el codi → un altre intent.
        if (err.code === 'P2002') continue;
        // P2003: la pertinença apunta a un usuari que no existeix.
        if (err.code === 'P2003') throw new ProfileNotFoundError();
      }
      throw err;
    }
  }
  throw new Error("No s'ha pogut generar un codi d'invitació únic");
}