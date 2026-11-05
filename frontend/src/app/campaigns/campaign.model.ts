// Forma d'una campanya tal com la retorna GET /api/campaigns
// (els camps del select de backend/src/routes/campaigns.ts).
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}
