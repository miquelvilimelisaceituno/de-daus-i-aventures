import { prisma } from '../db/prisma';
import type { Db } from '../db/types';
import { CAMPAIGN_SELECT } from './campaigns.repository';

// Accés a la taula memberships. Només Prisma: cap regla de negoci.

/**
 * La pertinença del màster d'una campanya.
 * Mai findUnique({ where: { campaignId } }): Prisma creu que campaignId és únic per
 * l'índex parcial (D46) i retornaria qualsevol membre, també un jugador.
 */
export function findMaster(campaignId: string, db: Db = prisma) {
  return db.membership.findFirst({ where: { campaignId, role: 'master' } });
}

/** La meva pertinença a una campanya (activa o no), amb si la campanya està arxivada. */
export function findWithCampaignState(userId: string, campaignId: string, db: Db = prisma) {
  return db.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
    select: { role: true, leftAt: true, campaign: { select: { archivedAt: true } } },
  });
}

export function find(userId: string, campaignId: string, db: Db = prisma) {
  return db.membership.findUnique({ where: { userId_campaignId: { userId, campaignId } } });
}

/** Les campanyes on l'usuari és membre actiu, amb el seu rol; les més recents primer. */
export function listActiveByUser(userId: string, db: Db = prisma) {
  return db.membership.findMany({
    where: { userId, leftAt: null },
    orderBy: { joinedAt: 'desc' },
    select: { role: true, campaign: { select: CAMPAIGN_SELECT } },
  });
}

/** Membres actius: primer el màster (ordre de l'enum) i després per antiguitat. */
export function listActiveByCampaign(campaignId: string, db: Db = prisma) {
  return db.membership.findMany({
    where: { campaignId, leftAt: null },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    select: { role: true, joinedAt: true, user: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export function countActivePlayers(campaignId: string, db: Db = prisma) {
  return db.membership.count({ where: { campaignId, role: 'player', leftAt: null } });
}

/** Entra com a jugador. Si ja hi havia estat, reactiva la mateixa fila (D31). */
export async function activateAsPlayer(userId: string, campaignId: string, db: Db = prisma) {
  const joined = await db.membership.upsert({
    where: { userId_campaignId: { userId, campaignId } },
    create: { userId, campaignId, role: 'player' },
    update: { leftAt: null, joinedAt: new Date(), role: 'player' },
    select: { campaign: { select: CAMPAIGN_SELECT } },
  });
  return joined.campaign;
}

/**
 * Posa left_at a un jugador actiu (la fila no s'esborra mai, D31). Retorna quantes files ha tocat.
 * leftAt: null → només una pertinença activa. role: 'player' → mai el màster.
 */
export async function deactivatePlayer(userId: string, campaignId: string, db: Db = prisma) {
  const { count } = await db.membership.updateMany({
    where: { userId, campaignId, leftAt: null, role: 'player' },
    data: { leftAt: new Date() },
  });
  return count;
}