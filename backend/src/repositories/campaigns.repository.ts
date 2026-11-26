import { prisma } from '../db/prisma';
import type { Db } from '../db/types';
import type { Prisma } from '../generated/prisma/client';

// Accés a la taula campaigns. Només Prisma: cap regla de negoci.
// Cada funció accepta `db` (per defecte, prisma) per poder-se fer servir dins d'una transacció.

// Llista blanca de camps de la campanya que surten a «Les meves campanyes» (D33).
export const CAMPAIGN_SELECT = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  inviteCode: true,
  archivedAt: true,
} as const satisfies Prisma.CampaignSelect;

// Detall (/api/campaigns/:cid): també la configuració de les invitacions.
export const CAMPAIGN_DETAIL_SELECT = {
  ...CAMPAIGN_SELECT,
  inviteOpen: true,
  maxPlayers: true,
} as const satisfies Prisma.CampaignSelect;

export type CampaignRow = Prisma.CampaignGetPayload<{ select: typeof CAMPAIGN_SELECT }>;
export type CampaignDetailRow = Prisma.CampaignGetPayload<{ select: typeof CAMPAIGN_DETAIL_SELECT }>;

export interface CampaignData {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  inviteOpen?: boolean;
  maxPlayers?: number;
}

/**
 * Crea la campanya i la pertinença de màster en una sola escriptura niuada:
 * si falla la pertinença, la campanya tampoc es crea.
 */
export function createWithMaster(
  userId: string,
  data: CampaignData & { name: string },
  inviteCode: string,
  db: Db = prisma,
) {
  return db.campaign.create({
    data: { ...data, inviteCode, memberships: { create: { userId, role: 'master' } } },
    select: CAMPAIGN_SELECT,
  });
}

export function findDetail(id: string, db: Db = prisma) {
  return db.campaign.findUniqueOrThrow({ where: { id }, select: CAMPAIGN_DETAIL_SELECT });
}

export function update(id: string, data: CampaignData, db: Db = prisma) {
  return db.campaign.update({ where: { id }, data, select: CAMPAIGN_DETAIL_SELECT });
}

export function updateInviteCode(id: string, inviteCode: string, db: Db = prisma) {
  return db.campaign.update({ where: { id }, data: { inviteCode }, select: { inviteCode: true } });
}

/** Fila tal com la retorna la consulta SQL (noms de columna, no de Prisma). */
interface LockedCampaignRow {
  id: string;
  invite_open: boolean;
  max_players: number;
  archived_at: Date | null;
}

/**
 * Busca la campanya pel codi i la bloqueja (FOR UPDATE) fins al final de la transacció.
 * Només té sentit dins d'una transacció (`db` = tx). SQL directe perquè Prisma no sap
 * escriure FOR UPDATE; el codi va com a paràmetre, sense risc d'injecció SQL.
 */
export async function lockByInviteCode(code: string, db: Db) {
  const [row] = await db.$queryRaw<LockedCampaignRow[]>`
    SELECT id, invite_open, max_players, archived_at
    FROM campaigns WHERE invite_code = ${code}
    FOR UPDATE
  `;
  if (!row) return null;
  return {
    id: row.id,
    inviteOpen: row.invite_open,
    maxPlayers: row.max_players,
    archived: row.archived_at !== null,
  };
}