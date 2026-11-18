import type { Prisma } from '../generated/prisma/client';
import type { MembershipRole } from '../generated/prisma/enums';

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