import { afterAll, beforeEach, expect, it } from '@jest/globals';
import { findMaster } from '../src/repositories/memberships.repository';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// El parany de D46: findUnique({ where: { campaignId } }) pot retornar un jugador.
it('retorna el màster encara que el jugador sigui el primer membre', async () => {
  await prisma.user.createMany({
    data: [
      { id: 'laia', name: 'Laia' },
      { id: 'miquel', name: 'Miquel' },
    ],
  });
  const campaign = await prisma.campaign.create({ data: { name: 'El final infinit', inviteCode: 'DRAC2024' } });
  await prisma.membership.create({ data: { userId: 'laia', campaignId: campaign.id, role: 'player' } });
  await prisma.membership.create({ data: { userId: 'miquel', campaignId: campaign.id, role: 'master' } });

  const master = await findMaster(campaign.id);

  expect(master).toMatchObject({ userId: 'miquel', role: 'master' });
});