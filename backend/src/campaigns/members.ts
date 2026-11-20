import { prisma } from '../db/prisma';
import { HttpError } from '../http/http-error';
import type { CampaignMember } from '../auth/load-membership';

export const MASTER_CANNOT_LEAVE =
  'El màster no pot sortir de la seva campanya: arxiva-la o elimina-la';
export const MEMBER_NOT_FOUND = 'Membre no trobat';

/** Membres actius: primer el màster (ordre de l'enum) i després per antiguitat. */
export async function listMembers(campaignId: string) {
  const memberships = await prisma.membership.findMany({
    where: { campaignId, leftAt: null },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    select: { role: true, joinedAt: true, user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return memberships.map(({ user, role, joinedAt }) => ({
    userId: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role,
    joinedAt,
  }));
}

/**
 * Sortir (userId = jo mateix, HU-15) o expulsar (el màster treu un jugador, HU-14).
 * La fila no s'esborra mai: es posa left_at (D31).
 */
export async function removeMember(me: CampaignMember, userId: string) {
  const leaving = userId === me.userId;

  if (leaving && me.role === 'master') throw new HttpError(409, MASTER_CANNOT_LEAVE);
  if (!leaving && me.role !== 'master') throw new HttpError(403, 'No tens permís per fer això');
  // Sortir sempre es pot; expulsar és gestionar la campanya i una arxivada és de només lectura.
  if (!leaving && me.campaignArchived) {
    throw new HttpError(409, 'La campanya està arxivada i és només de lectura');
  }

  // updateMany amb leftAt: null → només toca una pertinença activa, i si no n'hi ha, count = 0.
  // role: 'player' → el màster mai es pot treure per aquesta via.
  const { count } = await prisma.membership.updateMany({
    where: { userId, campaignId: me.campaignId, leftAt: null, role: 'player' },
    data: { leftAt: new Date() },
  });
  if (count === 0) throw new HttpError(404, MEMBER_NOT_FOUND);

  // Pendent quan existeixin les taules (mateixa transacció, CRUD §5.3):
  // - F4: el seu personatge actiu passa a 'retired'.
  // - F5b: s'esborren els seus vots de propostes obertes.
}