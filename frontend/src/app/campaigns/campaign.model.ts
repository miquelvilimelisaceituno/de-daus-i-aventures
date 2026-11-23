// Formes de les respostes de /api/campaigns (backend/src/campaigns/campaign-view.ts).

export type CampaignRole = 'master' | 'player';

/** Com es mostra cada rol a la interfície. */
export const ROLE_LABELS: Record<CampaignRole, string> = { master: 'Màster', player: 'Jugador' };

/** Una campanya de «Les meves campanyes», amb el meu rol. */
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Data ISO; null si la campanya està activa. Una arxivada és només de lectura. */
  archivedAt: string | null;
  role: CampaignRole;
  /** Només arriba al màster. */
  inviteCode?: string;
}

/** Detall de GET /api/campaigns/:cid. La configuració de les invitacions només arriba al màster. */
export interface CampaignDetail extends Campaign {
  inviteOpen?: boolean;
  maxPlayers?: number;
}

/** Canvis de PATCH /api/campaigns/:cid (només el màster). Tot és opcional. */
export interface CampaignChanges {
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  inviteOpen?: boolean;
  maxPlayers?: number;
}

/** Un membre actiu de GET /api/campaigns/:cid/members (primer el màster, després per antiguitat). */
export interface Member {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: CampaignRole;
  joinedAt: string;
}

/** Cos de POST /api/campaigns. */
export interface NewCampaign {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}