import { prisma } from '../db/prisma';
import { HttpError } from '../http/http-error';
import { CAMPAIGN_SELECT } from './campaign-view';
import { ProfileNotFoundError } from './create-campaign';

// Missatges de MVP §5.1 i del Gherkin d'HU-12.
export const INVALID_CODE = 'Codi no vàlid';
export const ALREADY_MEMBER = "Ja formes part d'aquesta campanya";
export const NOT_ACCEPTING = 'Aquesta campanya no admet nous jugadors';

// Fila tal com la retorna la consulta SQL (noms de columna, no de Prisma).
interface LockedCampaign {
  id: string;
  invite_open: boolean;
  max_players: number;
  archived_at: Date | null;
}

/**
 * Uneix l'usuari com a jugador a la campanya del codi (HU-12).
 * Si n'havia sortit, reactiva la mateixa pertinença (D31).
 */
export async function joinCampaign(userId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    // FOR UPDATE bloqueja la fila de la campanya fins al final de la transacció:
    // si dues persones s'uneixen alhora, la segona espera i compta els jugadors
    // després que la primera hagi entrat. Així no es pot superar max_players.
    const [campaign] = await tx.$queryRaw<LockedCampaign[]>`
      SELECT id, invite_open, max_players, archived_at
      FROM campaigns WHERE invite_code = ${code}
      FOR UPDATE
    `;
    if (!campaign) throw new HttpError(404, INVALID_CODE);
    const campaignId = campaign.id;

    const profile = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!profile) throw new ProfileNotFoundError();

    const membership = await tx.membership.findUnique({
      where: { userId_campaignId: { userId, campaignId } },
    });
    if (membership && !membership.leftAt) throw new HttpError(409, ALREADY_MEMBER);

    const players = await tx.membership.count({ where: { campaignId, role: 'player', leftAt: null } });
    if (!campaign.invite_open || campaign.archived_at || players >= campaign.max_players) {
      throw new HttpError(403, NOT_ACCEPTING);
    }

    // Si ja hi havia estat, es reactiva la mateixa fila; si no, se'n crea una.
    const joined = await tx.membership.upsert({
      where: { userId_campaignId: { userId, campaignId } },
      create: { userId, campaignId, role: 'player' },
      update: { leftAt: null, joinedAt: new Date(), role: 'player' },
      select: { campaign: { select: CAMPAIGN_SELECT } },
    });
    return joined.campaign;
  });
}