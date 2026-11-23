import path from 'node:path';
import { afterAll, beforeEach, expect } from '@jest/globals';
import { defineFeature, loadFeature, type DefineStepFunction } from 'jest-cucumber';
import request, { type Response } from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/prisma';
import { resetDb } from '../helpers/db';

const feature = loadFeature(path.join(__dirname, '../../../features/campanyes.feature'));
const app = createApp();

// D21: amb NODE_ENV=test, "test:<uid>" és un token vàlid per a aquest uid.
const as = (uid: string) => ({ Authorization: `Bearer test:${uid}` });

defineFeature(feature, (test) => {
  let res: Response;

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const myCampaigns = async (uid: string) => (await request(app).get('/api/campaigns').set(as(uid))).body;

  const givenProfile = (given: DefineStepFunction) =>
    given(/^l'usuari "(.*)" té el perfil creat$/, async (uid: string) => {
      await prisma.user.create({ data: { id: uid, name: uid } });
    });

  test('Crear una campanya', ({ given, when, then, and }) => {
    givenProfile(given);

    when(/^el "(.*)" crea la campanya "(.*)"$/, async (uid: string, name: string) => {
      res = await request(app).post('/api/campaigns').set(as(uid)).send({ name });
    });

    then(/^la resposta té el codi (\d+)$/, (code: string) => {
      expect(res.status).toBe(Number(code));
    });

    and(/^el "(.*)" veu "(.*)" a les seves campanyes amb el rol "(.*)"$/, async (uid: string, name: string, role: string) => {
      expect(await myCampaigns(uid)).toEqual([expect.objectContaining({ name, role })]);
    });

    and(/^el "(.*)" veu el codi d'invitació de "(.*)"$/, async (uid: string, name: string) => {
      const [campaign] = await myCampaigns(uid);
      expect(campaign.name).toBe(name);
      expect(campaign.inviteCode).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    });
  });

  test('Nom massa curt', ({ given, when, then, and }) => {
    givenProfile(given);

    when(/^el "(.*)" crea la campanya "(.*)"$/, async (uid: string, name: string) => {
      res = await request(app).post('/api/campaigns').set(as(uid)).send({ name });
    });

    then(/^la resposta té el codi (\d+)$/, (code: string) => {
      expect(res.status).toBe(Number(code));
    });

    and(/^el "(.*)" no té cap campanya$/, async (uid: string) => {
      expect(await myCampaigns(uid)).toEqual([]);
    });
  });

  test('Només veu les campanyes on és membre', ({ given, and, when, then }) => {
    // Dos «Given» amb el mateix text: el del Background i el de l'escenari.
    givenProfile(given);
    givenProfile(given);

    and(/^el "(.*)" ha creat la campanya "(.*)"$/, async (uid: string, name: string) => {
      await request(app).post('/api/campaigns').set(as(uid)).send({ name }).expect(201);
    });

    and(/^la "(.*)" ha creat la campanya "(.*)"$/, async (uid: string, name: string) => {
      await request(app).post('/api/campaigns').set(as(uid)).send({ name }).expect(201);
    });

    when(/^la "(.*)" consulta les seves campanyes$/, async (uid: string) => {
      res = await request(app).get('/api/campaigns').set(as(uid));
    });

    then(/^només veu la campanya "(.*)"$/, (name: string) => {
      expect(res.body.map((c: { name: string }) => c.name)).toEqual([name]);
    });
  });
});