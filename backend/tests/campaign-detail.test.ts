import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

const app = createApp();

// D21: amb NODE_ENV=test, "test:<uid>" és un token vàlid per a aquest uid.
const as = (uid: string) => ({ Authorization: `Bearer test:${uid}` });

let cid: string;
const url = () => `/api/campaigns/${cid}`;

beforeEach(async () => {
  await resetDb();
  await prisma.user.createMany({
    data: [
      { id: 'miquel', name: 'Miquel' },
      { id: 'laia', name: 'Laia' },
      { id: 'pau', name: 'Pau' },
    ],
  });
  const campaign = await prisma.campaign.create({
    data: {
      name: 'El final infinit',
      inviteCode: 'DRAC2024',
      memberships: {
        create: [
          { userId: 'miquel', role: 'master' },
          { userId: 'laia', role: 'player' },
        ],
      },
    },
  });
  cid = campaign.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/campaigns/:cid (loadMembership)', () => {
  it('no token → 401', async () => {
    const res = await request(app).get(url());
    expect(res.status).toBe(401);
  });

  it('the master sees the detail with the code and the invitation settings', async () => {
    const res = await request(app).get(url()).set(as('miquel'));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: cid,
      name: 'El final infinit',
      role: 'master',
      inviteCode: 'DRAC2024',
      inviteOpen: true,
      maxPlayers: 6,
    });
  });

  it('the player sees the detail without the code or the settings', async () => {
    const res = await request(app).get(url()).set(as('laia'));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'El final infinit', role: 'player' });
    expect(res.body).not.toHaveProperty('inviteCode');
    expect(res.body).not.toHaveProperty('inviteOpen');
    expect(res.body).not.toHaveProperty('maxPlayers');
  });

  it('a non-member → 403', async () => {
    const res = await request(app).get(url()).set(as('pau'));
    expect(res.status).toBe(403);
  });

  it('someone who has left the campaign → 403', async () => {
    await prisma.membership.update({
      where: { userId_campaignId: { userId: 'laia', campaignId: cid } },
      data: { leftAt: new Date() },
    });

    const res = await request(app).get(url()).set(as('laia'));
    expect(res.status).toBe(403);
  });

  it('a campaign that does not exist → 403, the same as if you were not a member', async () => {
    const res = await request(app)
      .get('/api/campaigns/0193a2b4-0000-7000-8000-000000000000')
      .set(as('miquel'));
    expect(res.status).toBe(403);
  });

  it('an id that is not a UUID → 403, not 500', async () => {
    const res = await request(app).get('/api/campaigns/no-es-un-uuid').set(as('miquel'));
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/campaigns/:cid', () => {
  it('the master closes invitations and limits the players (HU-16)', async () => {
    const res = await request(app).patch(url()).set(as('miquel')).send({ inviteOpen: false, maxPlayers: 4 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ inviteOpen: false, maxPlayers: 4 });
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: cid } });
    expect(campaign).toMatchObject({ inviteOpen: false, maxPlayers: 4 });
  });

  it('the master changes the name', async () => {
    const res = await request(app).patch(url()).set(as('miquel')).send({ name: 'El final finit' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('El final finit');
  });

  it('a player → 403 and nothing changes', async () => {
    const res = await request(app).patch(url()).set(as('laia')).send({ inviteOpen: false });

    expect(res.status).toBe(403);
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: cid } });
    expect(campaign.inviteOpen).toBe(true);
  });

  it.each([0, 13, 2.5])('maxPlayers = %p → 400', async (maxPlayers) => {
    const res = await request(app).patch(url()).set(as('miquel')).send({ maxPlayers });

    expect(res.status).toBe(400);
    expect(res.body.fields.maxPlayers).toBeDefined();
  });

  it("does not allow changing the invite code here → 400", async () => {
    const res = await request(app).patch(url()).set(as('miquel')).send({ inviteCode: 'ALTRE234' });
    expect(res.status).toBe(400);
  });

  it('an archived campaign is read-only → 409', async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { archivedAt: new Date() } });

    const res = await request(app).patch(url()).set(as('miquel')).send({ name: 'Un altre nom' });

    expect(res.status).toBe(409);
  });
});