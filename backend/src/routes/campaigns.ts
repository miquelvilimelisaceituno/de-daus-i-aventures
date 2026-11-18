import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/require-auth';
import { CAMPAIGN_SELECT, toCampaignView } from '../campaigns/campaign-view';
import { createCampaign, ProfileNotFoundError } from '../campaigns/create-campaign';
import { prisma } from '../db/prisma';
import { sendValidationError } from '../http/validation';

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

const createSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(3, 'El nom ha de tenir com a mínim 3 caràcters')
    .max(60, 'El nom pot tenir com a màxim 60 caràcters'),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.url({ protocol: /^https?$/ }).max(500).nullable().optional(),
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