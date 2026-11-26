import { isForeignKeyViolation } from '../db/errors';
import { inTransaction } from '../db/transaction';
import { HttpError } from '../http/http-error';
import * as campaignsRepository from '../repositories/campaigns.repository';
import * as membershipsRepository from '../repositories/memberships.repository';
import * as usersRepository from '../repositories/users.repository';
import type { CreateCampaign, UpdateCampaign } from '../schemas/campaigns.schemas';
import { ProfileNotFoundError } from './errors';
import { generateInviteCode, withFreshInviteCode } from './invite-code';

// Lògica de les campanyes (F1). No sap res d'Express ni de Prisma:
// rep dades, aplica les regles i llança HttpError.

// Missatges de MVP §5.1 i del Gherkin d'HU-12.
export const INVALID_CODE = 'Codi no vàlid';
export const ALREADY_MEMBER = "Ja formes part d'aquesta campanya";
export const NOT_ACCEPTING = 'Aquesta campanya no admet nous jugadors';

/** «Les meves campanyes»: on soc membre actiu, amb el meu rol (HU-13). */
export function listMine(userId: string) {
  return membershipsRepository.listActiveByUser(userId);
}

/**
 * Crea la campanya amb l'usuari com a màster (HU-10).
 * El generador de codis es pot substituir als tests per provar els reintents.
 */
export async function createCampaign(
  userId: string,
  data: CreateCampaign,
  generateCode: () => string = generateInviteCode,
) {
  try {
    // En una campanya nova, l'únic valor que es pot repetir és el codi.
    return await withFreshInviteCode(
      (inviteCode) => campaignsRepository.createWithMaster(userId, data, inviteCode),
      generateCode,
    );
  } catch (err) {
    // La pertinença apunta a un usuari que no existeix: no ha cridat POST /api/me.
    if (isForeignKeyViolation(err)) throw new ProfileNotFoundError();
    throw err;
  }
}

/** Detall. loadMembership ja ha comprovat que la campanya existeix i que en soc membre. */
export function getDetail(campaignId: string) {
  return campaignsRepository.findDetail(campaignId);
}

/** Editar la campanya i les invitacions (màster, HU-16). El rol el comprova la ruta. */
export function updateCampaign(campaignId: string, data: UpdateCampaign) {
  return campaignsRepository.update(campaignId, data);
}

/** Codi nou; l'antic deixa de funcionar al moment (màster, HU-11). */
export function regenerateInviteCode(campaignId: string) {
  return withFreshInviteCode((inviteCode) => campaignsRepository.updateInviteCode(campaignId, inviteCode));
}

/**
 * Uneix l'usuari com a jugador a la campanya del codi (HU-12).
 * Tot dins d'una transacció: la campanya queda bloquejada (FOR UPDATE) fins al final,
 * i si dues persones s'uneixen alhora, la segona compta els jugadors després de la primera.
 */
export function joinCampaign(userId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();

  return inTransaction(async (tx) => {
    const campaign = await campaignsRepository.lockByInviteCode(code, tx);
    if (!campaign) throw new HttpError(404, INVALID_CODE);

    if (!(await usersRepository.exists(userId, tx))) throw new ProfileNotFoundError();

    const membership = await membershipsRepository.find(userId, campaign.id, tx);
    if (membership && !membership.leftAt) throw new HttpError(409, ALREADY_MEMBER);

    const players = await membershipsRepository.countActivePlayers(campaign.id, tx);
    if (!campaign.inviteOpen || campaign.archived || players >= campaign.maxPlayers) {
      throw new HttpError(403, NOT_ACCEPTING);
    }

    return membershipsRepository.activateAsPlayer(userId, campaign.id, tx);
  });
}