import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/require-auth';
import {
  currentMember,
  loadMembership,
  requireActiveCampaign,
  requireRole,
} from '../auth/load-membership';
import {
  CAMPAIGN_DETAIL_SELECT,
  CAMPAIGN_SELECT,
  toCampaignDetail,
  toCampaignView,
} from '../campaigns/campaign-view';
import { createCampaign, ProfileNotFoundError } from '../campaigns/create-campaign';
import { prisma } from '../db/prisma';
import { sendValidationError } from '../http/validation';

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

const nameSchema = z
  .string()
  .trim()
  .min(3, 'El nom ha de tenir com a mínim 3 caràcters')
  .max(60, 'El nom pot tenir com a màxim 60 caràcters');
const descriptionSchema = z.string().trim().max(2000).nullable().optional();
const imageUrlSchema = z.url({ protocol: /^https?$/ }).max(500).nullable().optional();

const createSchema = z.strictObject({
  name: nameSchema,
  description: descriptionSchema,
  imageUrl: imageUrlSchema,
});

// Tot opcional (PATCH parcial). El codi es regenera amb una acció pròpia (HU-11).
const updateSchema = z.strictObject({
  name: nameSchema.optional(),
  description: descriptionSchema,
  imageUrl: imageUrlSchema,
  inviteOpen: z.boolean().optional(),
  maxPlayers: z
    .int('Ha de ser un nombre enter')
    .min(1, 'Com a mínim 1 jugador')
    .max(12, 'Com a màxim 12 jugadors')
    .optional(),
});

// GET /api/campaigns → les campanyes on soc membre actiu, amb el meu rol (HU-13).
campaignsRouter.get('/', async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: currentUser(req).uid, leftAt: null },
    orderBy: { joinedAt: 'desc' },
    select: { role: true, campaign: { select: CAMPAIGN_SELECT } },
  });
  res.json(memberships.map((m) => toCampaignView(m.campaign, m.role)));
});

// POST /api/campaigns → crea la campanya i en soc el màster (HU-10).
campaignsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const campaign = await createCampaign(currentUser(req).uid, parsed.data);
    res.status(201).json(toCampaignView(campaign, 'master'));
  } catch (err) {
    if (err instanceof ProfileNotFoundError) {
      res.status(404).json({ error: 'Perfil no trobat' });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Rutes d'una campanya concreta: /api/campaigns/:cid/...
// Les rutes amb un nom fix (com POST /join, HU-12) s'han de declarar ABANS d'aquesta
// línia; si no, loadMembership les interpretaria com un :cid i respondria 403.
// ---------------------------------------------------------------------------
const campaignRouter = Router({ mergeParams: true });
campaignsRouter.use('/:cid', loadMembership, campaignRouter);

// GET /api/campaigns/:cid → detall amb el meu rol (membre).
campaignRouter.get('/', async (req, res) => {
  const { campaignId, role } = currentMember(req);
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    select: CAMPAIGN_DETAIL_SELECT,
  });
  res.json(toCampaignDetail(campaign, role));
});

// PATCH /api/campaigns/:cid → editar la campanya i les invitacions (màster, HU-16).
campaignRouter.patch('/', requireRole('master'), requireActiveCampaign, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const { campaignId, role } = currentMember(req);
  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: parsed.data,
    select: CAMPAIGN_DETAIL_SELECT,
  });
  res.json(toCampaignDetail(campaign, role));
});