import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

const app = createApp();

// D21: amb NODE_ENV=test, "test:<uid>" és un token vàlid per a aquest uid.
const as = (uid: string) => ({ Authorization: `Bearer test:${uid}` });
const join = (uid: string, code: string) =>
  request(app).post('/api/campaigns/join').set(as(uid)).send({ code });

let cid: string;
const membership = (userId: string) =>
  prisma.membership.findUnique({ where: { userId_campaignId: { userId, campaignId: cid } } });

beforeEach(async () => {
  await resetDb();
  await prisma.user.createMany({
    data: ['miquel', 'laia', 'pau', 'anna'].map((id) => ({ id, name: id })),
  });
  const campaign = await prisma.campaign.create({
    data: {
      name: 'El final infinit',
      inviteCode: 'DRAC2024',
      memberships: { create: { userId: 'miquel', role: 'master' } },
    },
  });
  cid = campaign.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/campaigns/join (HU-12)', () => {
  it('with a valid code, joins as a player and does not see the code', async () => {
    const res = await join('laia', 'DRAC2024');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: cid, name: 'El final infinit', role: 'player' });
    expect(res.body).not.toHaveProperty('inviteCode');
    expect(await membership('laia')).toMatchObject({ role: 'player', leftAt: null });
  });

  it('accepts the code in lowercase and with spaces', async () => {
    const res = await join('laia', '  drac2024 ');
    expect(res.status).toBe(200);
  });

  it('unknown code → 404 «Codi no vàlid»', async () => {
    const res = await join('laia', 'XXXX0000');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Codi no vàlid');
    expect(await membership('laia')).toBeNull();
  });

  it('no code → 400', async () => {
    const res = await request(app).post('/api/campaigns/join').set(as('laia')).send({});
    expect(res.status).toBe(400);
  });

  it('already a player → 409 and still has a single membership', async () => {
    await join('laia', 'DRAC2024');

    const res = await join('laia', 'DRAC2024');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Ja formes part d'aquesta campanya");
    expect(await prisma.membership.count({ where: { userId: 'laia' } })).toBe(1);
  });

  it('the master with their own code → 409', async () => {
    const res = await join('miquel', 'DRAC2024');
    expect(res.status).toBe(409);
  });

  it('invitations closed → 403 «no admet nous jugadors» (HU-16)', async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { inviteOpen: false } });

    const res = await join('laia', 'DRAC2024');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Aquesta campanya no admet nous jugadors');
  });

  it('campaign full → 403 (the master does not count as a player) (HU-16)', async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { maxPlayers: 1 } });
    expect((await join('laia', 'DRAC2024')).status).toBe(200);

    const res = await join('pau', 'DRAC2024');

    expect(res.status).toBe(403);
  });

  it('archived campaign → 403', async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { archivedAt: new Date() } });

    const res = await join('laia', 'DRAC2024');
    expect(res.status).toBe(403);
  });

  it('someone who had left rejoins with the same membership (D31)', async () => {
    await join('laia', 'DRAC2024');
    const leftAt = new Date('2026-11-01T10:00:00Z');
    await prisma.membership.update({
      where: { userId_campaignId: { userId: 'laia', campaignId: cid } },
      data: { leftAt, joinedAt: leftAt },
    });

    const res = await join('laia', 'DRAC2024');

    expect(res.status).toBe(200);
    const row = await membership('laia');
    expect(row?.leftAt).toBeNull();
    expect(row!.joinedAt.getTime()).toBeGreaterThan(leftAt.getTime());
    expect(await prisma.membership.count({ where: { userId: 'laia' } })).toBe(1);
  });

  it('no profile → 404 «Perfil no trobat»', async () => {
    const res = await join('sense-perfil', 'DRAC2024');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Perfil no trobat');
  });

  it("with one free seat and two people at once, only one gets in", async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { maxPlayers: 1 } });

    const results = await Promise.all([join('laia', 'DRAC2024'), join('pau', 'DRAC2024')]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 403]);
    expect(await prisma.membership.count({ where: { campaignId: cid, role: 'player' } })).toBe(1);
  });
});

describe('POST /api/campaigns/:cid/invite-code (HU-11)', () => {
  const regenerate = (uid: string) => request(app).post(`/api/campaigns/${cid}/invite-code`).set(as(uid));

  it("the master gets a new code: the new one works and the old one no longer does", async () => {
    const res = await regenerate('miquel');

    expect(res.status).toBe(200);
    expect(res.body.inviteCode).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(res.body.inviteCode).not.toBe('DRAC2024');

    expect((await join('laia', 'DRAC2024')).status).toBe(404);
    expect((await join('laia', res.body.inviteCode)).status).toBe(200);
  });

  it('a player → 403 and the code does not change', async () => {
    await join('laia', 'DRAC2024');

    const res = await regenerate('laia');

    expect(res.status).toBe(403);
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: cid } });
    expect(campaign.inviteCode).toBe('DRAC2024');
  });

  it('archived campaign → 409', async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { archivedAt: new Date() } });

    const res = await regenerate('miquel');
    expect(res.status).toBe(409);
  });
});