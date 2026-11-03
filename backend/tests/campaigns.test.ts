import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it("respon 200 amb { ok: true }", async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /api/campaigns', () => {
  it("retorna les campanyes sense el codi d'invitació", async () => {
    await prisma.campaign.create({
      data: { name: 'El final infinit', inviteCode: 'DRAC2024' },
    });

    const res = await request(app).get('/api/campaigns');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ name: 'El final infinit' });
    expect(res.body[0]).not.toHaveProperty('inviteCode');
  });

  it('no retorna les campanyes arxivades', async () => {
    await prisma.campaign.createMany({
      data: [
        { name: 'Activa', inviteCode: 'ACTIVA01' },
        { name: 'Arxivada', inviteCode: 'ARXIU001', archivedAt: new Date() },
      ],
    });

    const res = await request(app).get('/api/campaigns');

    expect(res.status).toBe(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(['Activa']);
  });
});
