import path from 'node:path';
import { afterAll, beforeEach, expect } from '@jest/globals';
import { defineFeature, loadFeature } from 'jest-cucumber';
import request, { type Response } from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/prisma';
import { resetDb } from '../helpers/db';

const feature = loadFeature(path.join(__dirname, '../../../features/campanyes.feature'));
const app = createApp();

defineFeature(feature, (test) => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Llistar les campanyes existents', ({ given, when, then, and }) => {
    let res: Response;

    given(/^existeix la campanya "(.*)" amb el codi "(.*)"$/, async (name: string, code: string) => {
      await prisma.campaign.create({ data: { name, inviteCode: code } });
    });

    when('es consulten les campanyes', async () => {
      res = await request(app).get('/api/campaigns');
    });

    then(/^la resposta inclou la campanya "(.*)"$/, (name: string) => {
      expect(res.status).toBe(200);
      expect(res.body.map((c: { name: string }) => c.name)).toContain(name);
    });

    and("cap campanya mostra el codi d'invitació", () => {
      for (const campaign of res.body) {
        expect(campaign).not.toHaveProperty('inviteCode');
      }
    });
  });
});
