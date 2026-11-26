import type { MembershipRole } from '../generated/prisma/enums';

/**
 * Qui soc dins de la campanya de la URL. L'omple el middleware loadMembership
 * i el reben els serveis, que així no han de saber res d'Express.
 */
export interface CampaignMember {
  userId: string;
  campaignId: string;
  role: MembershipRole;
  campaignArchived: boolean;
}