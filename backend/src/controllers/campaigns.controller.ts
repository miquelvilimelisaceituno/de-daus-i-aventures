import type { Request, Response } from 'express';
import { currentMember } from '../middlewares/load-membership';
import { currentUser } from '../middlewares/require-auth';
import {
  createCampaignSchema,
  joinCampaignSchema,
  updateCampaignSchema,
} from '../schemas/campaigns.schemas';
import * as campaignsService from '../services/campaigns.service';
import { toCampaignDetail, toCampaignView } from '../views/campaign.view';

// Controlador de /api/campaigns: llegeix la petició, valida el cos, crida el servei
// i respon amb la vista. Un cos no vàlid llança ZodError i app.ts el converteix en 400.

/** GET /api/campaigns → les meves campanyes amb el meu rol (HU-13). */
export async function listMine(req: Request, res: Response) {
  const memberships = await campaignsService.listMine(currentUser(req).uid);
  res.json(memberships.map((m) => toCampaignView(m.campaign, m.role)));
}

/** POST /api/campaigns → crea la campanya i en soc el màster (HU-10). */
export async function create(req: Request, res: Response) {
  const data = createCampaignSchema.parse(req.body ?? {});
  const campaign = await campaignsService.createCampaign(currentUser(req).uid, data);
  res.status(201).json(toCampaignView(campaign, 'master'));
}

/** POST /api/campaigns/join → unir-se com a jugador amb un codi (HU-12). */
export async function join(req: Request, res: Response) {
  const { code } = joinCampaignSchema.parse(req.body ?? {});
  const campaign = await campaignsService.joinCampaign(currentUser(req).uid, code);
  res.json(toCampaignView(campaign, 'player'));
}

/** GET /api/campaigns/:cid → detall amb el meu rol. */
export async function getDetail(req: Request, res: Response) {
  const { campaignId, role } = currentMember(req);
  res.json(toCampaignDetail(await campaignsService.getDetail(campaignId), role));
}

/** PATCH /api/campaigns/:cid → editar la campanya i les invitacions (màster, HU-16). */
export async function update(req: Request, res: Response) {
  const data = updateCampaignSchema.parse(req.body ?? {});
  const { campaignId, role } = currentMember(req);
  res.json(toCampaignDetail(await campaignsService.updateCampaign(campaignId, data), role));
}

/** POST /api/campaigns/:cid/invite-code → codi nou (màster, HU-11). */
export async function regenerateInviteCode(req: Request, res: Response) {
  res.json(await campaignsService.regenerateInviteCode(currentMember(req).campaignId));
}