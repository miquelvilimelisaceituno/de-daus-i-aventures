import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

// Restriccions de la taula memberships que garanteix la BD (D30, D31).
// No passen per l'API: comproven el model de dades directament amb Prisma.

let campaignId: string;

beforeEach(async () => {
  await resetDb();
  await prisma.user.createMany({
    data: [
      { id: 'miquel', name: 'Miquel' },
      { id: 'laia', name: 'Laia' },
    ],
  });
  const campaign = await prisma.campaign.create({
    data: { name: 'El final infinit', inviteCode: 'DRAC2024' },
  });
  campaignId = campaign.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('memberships', () => {
  it('desa un màster i un jugador, actius per defecte', async () => {
    await prisma.membership.createMany({
      data: [
        { userId: 'miquel', campaignId, role: 'master' },
        { userId: 'laia', campaignId, role: 'player' },
      ],
    });

    const members = await prisma.membership.findMany({ where: { campaignId, leftAt: null } });
    expect(members).toHaveLength(2);
  });

  it('no permet un segon màster a la mateixa campanya', async () => {
    await prisma.membership.create({ data: { userId: 'miquel', campaignId, role: 'master' } });

    await expect(
      prisma.membership.create({ data: { userId: 'laia', campaignId, role: 'master' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('un usuari pot ser màster de dues campanyes diferents', async () => {
    const other = await prisma.campaign.create({ data: { name: 'Una altra', inviteCode: 'ALTRA001' } });

    await prisma.membership.createMany({
      data: [
        { userId: 'miquel', campaignId, role: 'master' },
        { userId: 'miquel', campaignId: other.id, role: 'master' },
      ],
    });

    expect(await prisma.membership.count({ where: { userId: 'miquel' } })).toBe(2);
  });

  it('no permet dues pertinences del mateix usuari a la mateixa campanya', async () => {
    await prisma.membership.create({ data: { userId: 'laia', campaignId, role: 'player' } });

    await expect(
      prisma.membership.create({ data: { userId: 'laia', campaignId, role: 'player' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('eliminar la campanya elimina les seves pertinences en cascada', async () => {
    await prisma.membership.create({ data: { userId: 'laia', campaignId, role: 'player' } });

    await prisma.campaign.delete({ where: { id: campaignId } });

    expect(await prisma.membership.count()).toBe(0);
  });

  it('no es pot eliminar un usuari que té pertinences', async () => {
    await prisma.membership.create({ data: { userId: 'laia', campaignId, role: 'player' } });

    await expect(prisma.user.delete({ where: { id: 'laia' } })).rejects.toMatchObject({
      code: 'P2003',
    });
  });
});