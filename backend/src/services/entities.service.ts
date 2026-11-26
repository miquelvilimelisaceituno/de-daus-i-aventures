import * as entitiesRepository from '../repositories/entities.repository';
import type { EntityRow, EntityScope } from '../repositories/entities.repository';
import type { CampaignMember } from './campaign-member';
import { makeCrudService, type Policy } from './crud.service';
import { ForbiddenError } from './errors';

// Lògica del compendi (F3): PNJ, localitzacions i faccions.

const isMaster = (me: CampaignMember) => me.role === 'master';

/**
 * Qui pot fer què amb una entitat (MVP §5.6, CRUD §3.6).
 * - El màster ho veu i ho gestiona tot.
 * - El jugador només veu les revelades; una secreta no existeix (404). No pot escriure (403).
 * - Les arxivades no surten a la llista (només el màster les pot demanar a part), però el
 *   detall sí que es pot obrir: els encontres antics hi continuen enllaçant (HU-35).
 */
export const entityPolicy: Policy<EntityRow, EntityScope> = {
  listScope: (me) => ({ revealedOnly: !isMaster(me), allowArchived: isMaster(me) }),
  canRead: (me, entity) => isMaster(me) || !entity.isSecret,
  canCreate: isMaster,
  canUpdate: isMaster,
  canDelete: isMaster,
};

export const entitiesService = makeCrudService(entitiesRepository, entityPolicy);

// Pendent de F2 (HU-34, HU-35): remove() ha de comprovar les aparicions als encontres
// i respondre 409 «Arxiva-la en lloc d'eliminar-la» si en té.

/** Accions del màster sobre una entitat que ja existeix: revelar-la i arxivar-la o recuperar-la. */
async function change(me: CampaignMember, id: string, data: Parameters<typeof entitiesRepository.update>[2]) {
  const entity = await entitiesService.get(me, id);
  if (!entityPolicy.canUpdate(me, entity)) throw new ForbiddenError();
  return entitiesRepository.update(me.campaignId, id, data);
}

/** HU-32: la revela a tots els jugadors. Per tornar-la a amagar, PATCH amb isSecret: true. */
export const reveal = (me: CampaignMember, id: string) => change(me, id, { isSecret: false });

/** HU-35: surt de les llistes i dels selectors, però no es perd. */
export const archive = (me: CampaignMember, id: string) => change(me, id, { archivedAt: new Date() });
export const unarchive = (me: CampaignMember, id: string) => change(me, id, { archivedAt: null });