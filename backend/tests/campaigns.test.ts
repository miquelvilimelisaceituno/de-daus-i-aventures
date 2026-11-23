import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

const app = createApp();

// D21: amb NODE_ENV=test, "test:<uid>" és un token vàlid per a aquest uid.
const as = (uid: string) => ({ Authorization: `Bearer test:${uid}` });

const INVITE_CODE = /^[A-HJKMNP-Z2-9]{8}$/;

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Crea una campanya amb el màster i, opcionalment, jugadors. */
async function campaignWith(name: string, inviteCode: string, master: string, players: string[] = []) {
  return prisma.campaign.create({
    data: {
      name,
      inviteCode,
      memberships: {
        create: [
          { userId: master, role: 'master' },
          ...players.map((userId) => ({ userId, role: 'player' as const })),
        ],
      },
    },
  });
}

describe('GET /api/health', () => {
  it('respon 200 amb { ok: true }', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /api/campaigns', () => {
  beforeEach(async () => {
    await prisma.user.createMany({
      data: [
        { id: 'miquel', name: 'Miquel' },
        { id: 'laia', name: 'Laia' },
        { id: 'pau', name: 'Pau' },
      ],
    });
  });

  it('sense token → 401', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(401);
  });

  it('sense campanyes → llista buida', async () => {
    const res = await request(app).get('/api/campaigns').set(as('laia'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('només retorna les campanyes on soc membre, amb el meu rol', async () => {
    await campaignWith('El final infinit', 'DRAC2024', 'miquel', ['laia']);
    await campaignWith('Una altra', 'ALTRA001', 'pau');

    const res = await request(app).get('/api/campaigns').set(as('laia'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ name: 'El final infinit', role: 'player' });
  });

  it("el màster veu el codi d'invitació i el jugador no", async () => {
    await campaignWith('El final infinit', 'DRAC2024', 'miquel', ['laia']);

    const master = await request(app).get('/api/campaigns').set(as('miquel'));
    const player = await request(app).get('/api/campaigns').set(as('laia'));

    expect(master.body[0]).toMatchObject({ role: 'master', inviteCode: 'DRAC2024' });
    expect(player.body[0]).not.toHaveProperty('inviteCode');
  });

  it('no retorna les campanyes que he deixat', async () => {
    const campaign = await campaignWith('El final infinit', 'DRAC2024', 'miquel', ['laia']);
    await prisma.membership.update({
      where: { userId_campaignId: { userId: 'laia', campaignId: campaign.id } },
      data: { leftAt: new Date() },
    });

    const res = await request(app).get('/api/campaigns').set(as('laia'));

    expect(res.body).toEqual([]);
  });

  it('retorna les campanyes arxivades marcades amb archivedAt', async () => {
    const campaign = await campaignWith('El final infinit', 'DRAC2024', 'miquel');
    await prisma.campaign.update({ where: { id: campaign.id }, data: { archivedAt: new Date() } });

    const res = await request(app).get('/api/campaigns').set(as('miquel'));

    expect(res.body).toHaveLength(1);
    expect(res.body[0].archivedAt).not.toBeNull();
  });
});

describe('POST /api/campaigns', () => {
  beforeEach(async () => {
    await prisma.user.create({ data: { id: 'miquel', name: 'Miquel' } });
  });

  it('crea la campanya i en queda màster, amb un codi de 8 caràcters', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set(as('miquel'))
      .send({ name: '  El final infinit  ', description: 'La campanya del grup' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'El final infinit', role: 'master', archivedAt: null });
    expect(res.body.inviteCode).toMatch(INVITE_CODE);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { userId_campaignId: { userId: 'miquel', campaignId: res.body.id } },
    });
    expect(membership).toMatchObject({ role: 'master', leftAt: null });
  });

  it('nom de menys de 3 caràcters → 400 i no es crea res', async () => {
    const res = await request(app).post('/api/campaigns').set(as('miquel')).send({ name: 'EF' });

    expect(res.status).toBe(400);
    expect(res.body.fields.name).toBeDefined();
    expect(await prisma.campaign.count()).toBe(0);
  });

  it("no deixa triar el codi d'invitació → 400", async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set(as('miquel'))
      .send({ name: 'El final infinit', inviteCode: 'DRAC2024' });

    expect(res.status).toBe(400);
    expect(await prisma.campaign.count()).toBe(0);
  });

  it('sense perfil → 404 i no queda cap campanya a mitges', async () => {
    const res = await request(app).post('/api/campaigns').set(as('laia')).send({ name: 'Sense perfil' });

    expect(res.status).toBe(404);
    expect(await prisma.campaign.count()).toBe(0);
  });
});