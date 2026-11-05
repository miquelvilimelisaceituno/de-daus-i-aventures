import { Router } from 'express';
import { prisma } from '../db/prisma';

export const campaignsRouter = Router();

// PROVISIONAL (D27): retorna totes les campanyes no arxivades.
// A F0/F1 retornarà només les campanyes on l'usuari és membre actiu.
campaignsRouter.get('/', async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, description: true, imageUrl: true },
  });
  res.json(campaigns);
});
