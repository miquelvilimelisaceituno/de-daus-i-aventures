import type { MembershipRole } from '../generated/prisma/enums';
import type { CampaignDetailRow, CampaignRow } from '../repositories/campaigns.repository';

// Vistes: la forma del JSON que surt de l'API. Decideixen quins camps veu cada rol (D33, D47).

/** Campanya amb el meu rol. El codi d'invitació només el veu el màster. */
export function toCampaignView(campaign: CampaignRow, role: MembershipRole) {
  const { inviteCode, ...rest } = campaign;
  return role === 'master' ? { ...rest, role, inviteCode } : { ...rest, role };
}

/** Detall amb el meu rol. La configuració de les invitacions només la veu el màster. */
export function toCampaignDetail(campaign: CampaignDetailRow, role: MembershipRole) {
  const { inviteCode, inviteOpen, maxPlayers, ...rest } = campaign;
  return role === 'master'
    ? { ...rest, role, inviteCode, inviteOpen, maxPlayers }
    : { ...rest, role };
}