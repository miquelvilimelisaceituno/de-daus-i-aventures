import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../middlewares/require-auth';
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
import { createCampaign } from '../campaigns/create-campaign';
import { withFreshInviteCode } from '../campaigns/invite-code';
import { joinCampaign } from '../campaigns/join-campaign';
import { listMembers, removeMember } from '../campaigns/members';
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

  // Si l'usuari no té perfil, createCampaign llança un HttpError 404 i el respon app.ts.
  const campaign = await createCampaign(currentUser(req).uid, parsed.data);
  res.status(201).json(toCampaignView(campaign, 'master'));
});

const joinSchema = z.strictObject({
  code: z.string().trim().min(1, 'Escriu el codi').max(20),
});

// POST /api/campaigns/join → unir-se com a jugador amb un codi (HU-12).
// Ha d'anar abans del bloc /:cid (vegeu el comentari de sota).
campaignsRouter.post('/join', async (req, res) => {
  const parsed = joinSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const campaign = await joinCampaign(currentUser(req).uid, parsed.data.code);
  res.json(toCampaignView(campaign, 'player'));
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

// POST /api/campaigns/:cid/invite-code → codi nou; l'antic deixa de funcionar (màster, HU-11).
campaignRouter.post('/invite-code', requireRole('master'), requireActiveCampaign, async (req, res) => {
  const { campaignId } = currentMember(req);
  const campaign = await withFreshInviteCode((inviteCode) =>
    prisma.campaign.update({
      where: { id: campaignId },
      data: { inviteCode },
      select: { inviteCode: true },
    }),
  );
  res.json(campaign);
});

// GET /api/campaigns/:cid/members → membres actius (qualsevol membre).
campaignRouter.get('/members', async (req, res) => {
  res.json(await listMembers(currentMember(req).campaignId));
});

// DELETE /api/campaigns/:cid/members/:userId → sortir (jo mateix, HU-15) o expulsar (màster, HU-14).
campaignRouter.delete('/members/:userId', async (req, res) => {
  await removeMember(currentMember(req), req.params.userId);
  res.status(204).end();
});