import type { CampaignMember } from '../services/campaign-member';
import type { EntityRow } from '../repositories/entities.repository';

/**
 * Entitat del compendi. El jugador només rep entitats revelades, així que
 * isSecret no li aporta res i no s'envia.
 */
export function toEntityView(me: CampaignMember, entity: EntityRow) {
  if (me.role === 'master') return entity;
  const { isSecret: _secret, ...visible } = entity;
  return visible;
}