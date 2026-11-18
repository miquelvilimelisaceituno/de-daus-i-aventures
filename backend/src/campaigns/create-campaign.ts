import { prisma } from '../db/prisma';
import { Prisma } from '../generated/prisma/client';
import { HttpError } from '../http/http-error';
import { CAMPAIGN_SELECT } from './campaign-view';
import { generateInviteCode, withFreshInviteCode } from './invite-code';

export interface NewCampaign {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

/** L'usuari no té perfil: POST /api/me no s'ha cridat. */
export class ProfileNotFoundError extends HttpError {
  constructor() {
    super(404, 'Perfil no trobat');
  }
}

/**
 * Crea la campanya amb l'usuari com a màster (HU-10).
 * El generador de codis es pot substituir als tests per provar els reintents.
 */

export async function createCampaign(
  userId: string,
  data: NewCampaign,
  generateCode: () => string = generateInviteCode,
) {
  try {
    return await withFreshInviteCode(
      // Escriptura niuada: campanya i pertinença en una sola transacció.
      // Si falla la pertinença, la campanya tampoc es crea.
      // En una campanya nova, l'únic valor que es pot repetir (P2002) és el codi.
      (inviteCode) =>
        prisma.campaign.create({
          data: { ...data, inviteCode, memberships: { create: { userId, role: 'master' } } },
          select: CAMPAIGN_SELECT,
        }),
      generateCode,
    );
    } catch (err) {
      // P2003: la pertinença apunta a un usuari que no existeix.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new ProfileNotFoundError();
      }
      throw err;
    }
  }