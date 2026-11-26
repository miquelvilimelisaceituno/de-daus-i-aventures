import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

const app = createApp();

// D21: amb NODE_ENV=test, "test:<uid>" és un token vàlid per a aquest uid.
const as = (uid: string) => ({ Authorization: `Bearer test:${uid}` });

let cid: string;
const members = (uid: string) => request(app).get(`/api/campaigns/${cid}/members`).set(as(uid));
const remove = (uid: string, target: string) =>
  request(app).delete(`/api/campaigns/${cid}/members/${target}`).set(as(uid));
const membership = (userId: string) =>
  prisma.membership.findUniqueOrThrow({ where: { userId_campaignId: { userId, campaignId: cid } } });

beforeEach(async () => {
  await resetDb();
  await prisma.user.createMany({
    data: [
      { id: 'miquel', name: 'Miquel' },
      { id: 'laia', name: 'Laia' },
      { id: 'pau', name: 'Pau' },
      { id: 'anna', name: 'Anna' },
    ],
  });
  // El màster s'afegeix l'últim per comprovar que surt primer igualment.
  const campaign = await prisma.campaign.create({
    data: { name: 'El final infinit', inviteCode: 'DRAC2024' },
  });
  cid = campaign.id;
  await prisma.membership.create({ data: { userId: 'laia', campaignId: cid, role: 'player', joinedAt: new Date('2026-11-01') } });
  await prisma.membership.create({ data: { userId: 'pau', campaignId: cid, role: 'player', joinedAt: new Date('2026-11-02') } });
  await prisma.membership.create({ data: { userId: 'miquel', campaignId: cid, role: 'master', joinedAt: new Date('2026-11-03') } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/campaigns/:cid/members', () => {
  it('a player sees the active members: the master first, then by seniority', async () => {
    const res = await members('laia');

    expect(res.status).toBe(200);
    expect(res.body.map((m: { userId: string; role: string }) => [m.userId, m.role])).toEqual([
      ['miquel', 'master'],
      ['laia', 'player'],
      ['pau', 'player'],
    ]);
    expect(res.body[0]).toMatchObject({ name: 'Miquel', avatarUrl: null });
  });

  it('members who have left are not listed', async () => {
    await prisma.membership.update({
      where: { userId_campaignId: { userId: 'pau', campaignId: cid } },
      data: { leftAt: new Date() },
    });

    const res = await members('miquel');

    expect(res.body.map((m: { userId: string }) => m.userId)).toEqual(['miquel', 'laia']);
  });

  it('a non-member → 403', async () => {
    const res = await members('anna');
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/campaigns/:cid/members/:userId', () => {
  it("a player leaves (HU-15): the row is kept with left_at and access is lost", async () => {
    const res = await remove('laia', 'laia');

    expect(res.status).toBe(204);
    expect((await membership('laia')).leftAt).not.toBeNull();

    const mine = await request(app).get('/api/campaigns').set(as('laia'));
    expect(mine.body).toEqual([]);
    const detail = await request(app).get(`/api/campaigns/${cid}`).set(as('laia'));
    expect(detail.status).toBe(403);
  });

  it('the master removes a player (HU-14)', async () => {
    const res = await remove('miquel', 'pau');

    expect(res.status).toBe(204);
    expect((await membership('pau')).leftAt).not.toBeNull();
  });

  it('a player cannot remove another player → 403', async () => {
    const res = await remove('laia', 'pau');

    expect(res.status).toBe(403);
    expect((await membership('pau')).leftAt).toBeNull();
  });

  it('a player cannot remove the master → 403', async () => {
    const res = await remove('laia', 'miquel');
    expect(res.status).toBe(403);
  });

  it('the master cannot leave their own campaign → 409', async () => {
    const res = await remove('miquel', 'miquel');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('El màster no pot sortir de la seva campanya: arxiva-la o elimina-la');
    expect((await membership('miquel')).leftAt).toBeNull();
  });

  it('removing someone who is not a member → 404', async () => {
    const res = await remove('miquel', 'anna');
    expect(res.status).toBe(404);
  });

  it('removing someone who has already left → 404', async () => {
    await remove('pau', 'pau');

    const res = await remove('miquel', 'pau');
    expect(res.status).toBe(404);
  });

  it("a player can leave an archived campaign", async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { archivedAt: new Date() } });

    const res = await remove('laia', 'laia');
    expect(res.status).toBe(204);
  });

  it('nobody can be removed from an archived campaign → 409', async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { archivedAt: new Date() } });

    const res = await remove('miquel', 'pau');

    expect(res.status).toBe(409);
    expect((await membership('pau')).leftAt).toBeNull();
  });
});