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

export type CampaignRow = Prisma.CampaignGetPayload<{ select: typeof CAMPAIGN_SELECT }>;

/** Campanya amb el meu rol. El codi d'invitació només el veu el màster. */
export function toCampaignView(campaign: CampaignRow, role: MembershipRole) {
  const { inviteCode, ...rest } = campaign;
  return role === 'master' ? { ...rest, role, inviteCode } : { ...rest, role };
}