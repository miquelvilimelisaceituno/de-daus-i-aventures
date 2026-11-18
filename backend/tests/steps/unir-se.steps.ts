import path from 'node:path';
import { afterAll, beforeEach, expect } from '@jest/globals';
import { defineFeature, loadFeature, type DefineStepFunction } from 'jest-cucumber';
import request, { type Response } from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/prisma';
import { resetDb } from '../helpers/db';

const feature = loadFeature(path.join(__dirname, '../../../features/unir-se.feature'));
const app = createApp();

// Als escenaris els usuaris tenen nom («Laia»); el seu uid de prova és el nom en minúscules.
const uid = (name: string) => name.toLowerCase();
// D21: amb NODE_ENV=test, "test:<uid>" és un token vàlid per a aquest uid.
const as = (name: string) => ({ Authorization: `Bearer test:${uid(name)}` });
const ROLES: Record<string, string> = { Jugador: 'player', Màster: 'master' };

defineFeature(feature, (test) => {
  let res: Response;
  let cid: string;
  let master: string;

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const join = (name: string, code: string) =>
    request(app).post('/api/campaigns/join').set(as(name)).send({ code });

  // Passos que comparteixen tots els escenaris -----------------------------------

  const background = (given: DefineStepFunction, and: DefineStepFunction) => {
    given(
      /^la campanya "(.*)" amb el màster "(.*)" i el codi "(.*)"$/,
      async (name: string, masterName: string, inviteCode: string) => {
        master = masterName;
        await prisma.user.createMany({
          data: [masterName, 'Laia'].map((n) => ({ id: uid(n), name: n })),
        });
        const campaign = await prisma.campaign.create({
          data: { name, inviteCode, memberships: { create: { userId: uid(masterName), role: 'master' } } },
        });
        cid = campaign.id;
      },
    );

    and(/^la campanya admet (\d+) jugadors i en té (\d+)$/, async (max: string, count: string) => {
      const players = Array.from({ length: Number(count) }, (_, i) => `jugador${i + 1}`);
      await prisma.user.createMany({ data: players.map((id) => ({ id, name: id })) });
      await prisma.campaign.update({
        where: { id: cid },
        data: {
          maxPlayers: Number(max),
          memberships: { create: players.map((userId) => ({ userId, role: 'player' as const })) },
        },
      });
    });
  };

  const whenJoins = (when: DefineStepFunction) =>
    when(/^la "(.*)" s'uneix amb el codi "(.*)"$/, async (name: string, code: string) => {
      res = await join(name, code);
    });

  const thenError = (then: DefineStepFunction) =>
    then(/^veu l'error "(.*)"$/, (message: string) => {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error).toBe(message);
    });

  // Escenaris --------------------------------------------------------------------

  test('Codi vàlid', ({ given, and, when, then }) => {
    background(given, and);
    whenJoins(when);

    then(/^la "(.*)" veu "(.*)" a les seves campanyes amb el rol "(.*)"$/, async (name: string, campaign: string, role: string) => {
      const mine = await request(app).get('/api/campaigns').set(as(name));
      expect(mine.body).toEqual([expect.objectContaining({ name: campaign, role: ROLES[role] })]);
    });
  });

  test('Codi incorrecte', ({ given, and, when, then }) => {
    background(given, and);
    whenJoins(when);
    thenError(then);

    and(/^la "(.*)" no forma part de cap campanya$/, async (name: string) => {
      expect(await prisma.membership.count({ where: { userId: uid(name) } })).toBe(0);
    });
  });

  test('Ja forma part de la campanya', ({ given, and, when, then }) => {
    background(given, and);

    given(/^la "(.*)" ja és jugadora de "(.*)"$/, async (name: string) => {
      expect((await join(name, 'DRAC2024')).status).toBe(200);
    });

    whenJoins(when);
    thenError(then);

    and(/^la "(.*)" continua tenint una sola pertinença$/, async (name: string) => {
      expect(await prisma.membership.count({ where: { userId: uid(name) } })).toBe(1);
    });
  });

  test('La campanya no admet més jugadors', ({ given, and, when, then }) => {
    background(given, and);

    given('el màster ha tancat les invitacions', async () => {
      await request(app).patch(`/api/campaigns/${cid}`).set(as(master)).send({ inviteOpen: false }).expect(200);
    });

    whenJoins(when);
    thenError(then);
  });

  test('La campanya és plena', ({ given, and, when, then }) => {
    background(given, and);

    given(/^el màster ha limitat la campanya a (\d+) jugadors$/, async (max: string) => {
      await request(app)
        .patch(`/api/campaigns/${cid}`)
        .set(as(master))
        .send({ maxPlayers: Number(max) })
        .expect(200);
    });

    whenJoins(when);
    thenError(then);
  });

  test('Codi regenerat', ({ given, and, when, then }) => {
    background(given, and);

    given('el màster ha regenerat el codi', async () => {
      await request(app).post(`/api/campaigns/${cid}/invite-code`).set(as(master)).expect(200);
    });

    whenJoins(when);
    thenError(then);
  });
});