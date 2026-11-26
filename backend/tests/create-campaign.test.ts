import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createCampaign } from '../src/services/campaigns.service';
import { ProfileNotFoundError } from '../src/services/errors';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

beforeEach(async () => {
  await resetDb();
  await prisma.user.create({ data: { id: 'miquel', name: 'Miquel' } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Generador de prova: retorna els codis en ordre. */
function codes(...values: string[]) {
  return () => values.shift() ?? 'ULTIM234';
}

describe('createCampaign', () => {
  it('if the generated code already exists, tries another one', async () => {
    await prisma.campaign.create({ data: { name: 'Existent', inviteCode: 'DRAC2024' } });

    const campaign = await createCampaign('miquel', { name: 'El final infinit' }, codes('DRAC2024', 'NOU23456'));

    expect(campaign.inviteCode).toBe('NOU23456');
    expect(await prisma.campaign.count()).toBe(2);
  });

  it('after 5 repeated codes, fails without creating anything', async () => {
    await prisma.campaign.create({ data: { name: 'Existent', inviteCode: 'DRAC2024' } });

    await expect(createCampaign('miquel', { name: 'El final infinit' }, () => 'DRAC2024')).rejects.toThrow(
      "codi d'invitació únic",
    );
    expect(await prisma.campaign.count()).toBe(1);
  });

  it('no profile → ProfileNotFoundError and no half-created campaign', async () => {
    await expect(createCampaign('laia', { name: 'Sense perfil' })).rejects.toBeInstanceOf(ProfileNotFoundError);
    expect(await prisma.campaign.count()).toBe(0);
  });
});