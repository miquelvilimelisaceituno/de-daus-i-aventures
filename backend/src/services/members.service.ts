import { HttpError } from '../http/http-error';
import * as membershipsRepository from '../repositories/memberships.repository';
import type { CampaignMember } from './campaign-member';

// Lògica dels membres d'una campanya (F1).

export const MASTER_CANNOT_LEAVE =
  'El màster no pot sortir de la seva campanya: arxiva-la o elimina-la';
export const MEMBER_NOT_FOUND = 'Membre no trobat';

/** Membres actius: primer el màster i després per antiguitat. */
export function listMembers(campaignId: string) {
  return membershipsRepository.listActiveByCampaign(campaignId);
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

  const count = await membershipsRepository.deactivatePlayer(userId, me.campaignId);
  if (count === 0) throw new HttpError(404, MEMBER_NOT_FOUND);

  // Pendent quan existeixin les taules (mateixa transacció, CRUD §5.3):
  // - F4: el seu personatge actiu passa a 'retired'.
  // - F5b: s'esborren els seus vots de propostes obertes.
}