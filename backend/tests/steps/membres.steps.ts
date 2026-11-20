import path from 'node:path';
import { afterAll, beforeEach, expect } from '@jest/globals';
import { defineFeature, loadFeature, type DefineStepFunction } from 'jest-cucumber';
import request, { type Response } from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/prisma';
import { resetDb } from '../helpers/db';

const feature = loadFeature(path.join(__dirname, '../../../features/membres.feature'));
const app = createApp();

// Als escenaris els usuaris tenen nom («Laia»); el seu uid de prova és el nom en minúscules.
const uid = (name: string) => name.toLowerCase();
// D21: amb NODE_ENV=test, "test:<uid>" és un token vàlid per a aquest uid.
const as = (name: string) => ({ Authorization: `Bearer test:${uid(name)}` });

defineFeature(feature, (test) => {
  let res: Response;
  let cid: string;

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const myCampaignNames = async (name: string) => {
    const mine = await request(app).get('/api/campaigns').set(as(name));
    return mine.body.map((c: { name: string }) => c.name);
  };
  const leave = (name: string) =>
    request(app).delete(`/api/campaigns/${cid}/members/${uid(name)}`).set(as(name));

  // Passos que comparteixen els escenaris ----------------------------------------

  const background = (given: DefineStepFunction, and: DefineStepFunction) => {
    given(
      /^la campanya "(.*)" amb el màster "(.*)" i el codi "(.*)"$/,
      async (name: string, master: string, inviteCode: string) => {
        await prisma.user.create({ data: { id: uid(master), name: master } });
        const campaign = await prisma.campaign.create({
          data: { name, inviteCode, memberships: { create: { userId: uid(master), role: 'master' } } },
        });
        cid = campaign.id;
      },
    );

    // Els jugadors entren amb el codi, com ho farien de veritat.
    and(/^els jugadors "(.*)" i "(.*)"$/, async (first: string, second: string) => {
      for (const name of [first, second]) {
        await prisma.user.create({ data: { id: uid(name), name } });
        await request(app).post('/api/campaigns/join').set(as(name)).send({ code: 'DRAC2024' }).expect(200);
      }
    });
  };

  const whenLeaves = (when: DefineStepFunction) =>
    when(/^(?:la|el) "(.*)" surt de la campanya$/, async (name: string) => {
      res = await leave(name);
    });

  const whenExpels = (when: DefineStepFunction) =>
    when(/^(?:la|el) "(.*)" expulsa el "(.*)"$/, async (who: string, target: string) => {
      res = await request(app).delete(`/api/campaigns/${cid}/members/${uid(target)}`).set(as(who));
    });

  const thenNoLongerSees = (then: DefineStepFunction) =>
    then(/^(?:la|el) "(.*)" ja no veu "(.*)" a les seves campanyes$/, async (name: string, campaign: string) => {
      expect(res.status).toBe(204);
      expect(await myCampaignNames(name)).not.toContain(campaign);
    });

  const andMembersAre = (and: DefineStepFunction) =>
    and(/^els membres de la campanya són "(.*)"$/, async (list: string) => {
      const members = await request(app).get(`/api/campaigns/${cid}/members`).set(as('Miquel'));
      expect(members.body.map((m: { name: string }) => m.name)).toEqual(list.split(', '));
    });

  const thenError = (then: DefineStepFunction) =>
    then(/^veu l'error "(.*)"$/, (message: string) => {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error).toBe(message);
    });

  // Escenaris --------------------------------------------------------------------

  test('Una jugadora surt de la campanya', ({ given, and, when, then }) => {
    background(given, and);
    whenLeaves(when);
    thenNoLongerSees(then);

    and(/^la "(.*)" no pot entrar a la campanya$/, async (name: string) => {
      const detail = await request(app).get(`/api/campaigns/${cid}`).set(as(name));
      expect(detail.status).toBe(403);
    });
  });

  test('El màster expulsa un jugador', ({ given, and, when, then }) => {
    background(given, and);
    whenExpels(when);
    thenNoLongerSees(then);
    andMembersAre(and);
  });

  test('Un jugador no pot expulsar un altre jugador', ({ given, and, when, then }) => {
    background(given, and);
    whenExpels(when);
    thenError(then);
    andMembersAre(and);
  });

  test('El màster no pot sortir de la seva campanya', ({ given, and, when, then }) => {
    background(given, and);
    whenLeaves(when);
    thenError(then);
  });

  test('Qui ha sortit pot tornar a entrar amb el codi', ({ given, and, when, then }) => {
    background(given, and);

    given(/^la "(.*)" ha sortit de la campanya$/, async (name: string) => {
      await leave(name).expect(204);
    });

    when(/^la "(.*)" s'uneix amb el codi "(.*)"$/, async (name: string, code: string) => {
      res = await request(app).post('/api/campaigns/join').set(as(name)).send({ code });
    });

    then(/^la "(.*)" torna a veure "(.*)" a les seves campanyes$/, async (name: string, campaign: string) => {
      expect(res.status).toBe(200);
      expect(await myCampaignNames(name)).toContain(campaign);
    });
  });
});