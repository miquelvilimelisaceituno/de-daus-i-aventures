import path from 'node:path';
import { afterAll, beforeEach, expect } from '@jest/globals';
import { defineFeature, loadFeature, type DefineStepFunction } from 'jest-cucumber';
import request, { type Response } from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/prisma';
import { searchKey } from '../../src/db/search-key';
import { resetDb } from '../helpers/db';

const feature = loadFeature(path.join(__dirname, '../../../features/compendi.feature'));
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

  const url = (rest = '') => `/api/campaigns/${cid}/entities${rest}`;
  const idOf = async (name: string) =>
    (await prisma.entity.findFirstOrThrow({ where: { campaignId: cid, name } })).id;
  const compendium = async (name: string) => {
    const list = await request(app).get(url()).set(as(name)).expect(200);
    return list.body.map((e: { name: string }) => e.name).join(', ');
  };

  // Passos que comparteixen els escenaris ----------------------------------------
  // Les dades es preparen amb Prisma: l'API només es fa servir per a l'acció que es prova.

  const background = (given: DefineStepFunction, and: DefineStepFunction) => {
    given(
      /^la campanya "(.*)" amb el màster "(.*)" i la jugadora "(.*)"$/,
      async (name: string, master: string, player: string) => {
        await prisma.user.createMany({
          data: [
            { id: uid(master), name: master },
            { id: uid(player), name: player },
          ],
        });
        const campaign = await prisma.campaign.create({
          data: {
            name,
            inviteCode: 'DRAC2024',
            memberships: {
              create: [
                { userId: uid(master), role: 'master' },
                { userId: uid(player), role: 'player' },
              ],
            },
          },
        });
        cid = campaign.id;
      },
    );

    and(
      /^al compendi hi ha el PNJ revelat "(.*)" i la facció secreta "(.*)"$/,
      async (npc: string, faction: string) => {
        await prisma.entity.createMany({
          data: [
            { campaignId: cid, type: 'npc', name: npc, searchName: searchKey(npc), isSecret: false },
            { campaignId: cid, type: 'faction', name: faction, searchName: searchKey(faction), isSecret: true },
          ],
        });
      },
    );
  };

  const whenCreates = (when: DefineStepFunction) =>
    when(/^(?:la|el) "(.*)" crea el PNJ "(.*)"$/, async (who: string, name: string) => {
      res = await request(app).post(url()).set(as(who)).send({ type: 'npc', name });
    });

  const thenSees = (step: DefineStepFunction) =>
    step(/^(?:la|el) "(.*)" veu "(.*)" al compendi$/, async (who: string, expected: string) => {
      expect(await compendium(who)).toBe(expected);
    });

  const whenSearches = (when: DefineStepFunction) =>
    when(/^la "(.*)" cerca "(.*)"$/, async (who: string, text: string) => {
      res = await request(app).get(url(`?q=${encodeURIComponent(text)}`)).set(as(who));
    });

  // Escenaris -------------------------------------------------------------------

  test('Una entitat nova és secreta per defecte', ({ given, and, when, then }) => {
    background(given, and);
    whenCreates(when);
    thenSees(then);
    thenSees(and);
  });

  test('El màster revela una entitat secreta', ({ given, and, when, then }) => {
    background(given, and);
    when(/^el "(.*)" revela "(.*)"$/, async (who: string, name: string) => {
      res = await request(app).post(url(`/${await idOf(name)}/reveal`)).set(as(who));
      expect(res.status).toBe(200);
    });
    thenSees(then);
  });

  test('El jugador obre una entitat secreta per URL directa', ({ given, and, when, then }) => {
    background(given, and);
    when(/^la "(.*)" obre "(.*)"$/, async (who: string, name: string) => {
      res = await request(app).get(url(`/${await idOf(name)}`)).set(as(who));
    });
    then('rep un «no trobat»', () => {
      expect(res.status).toBe(404);
    });
  });

  test('Un jugador no pot crear entitats', ({ given, and, when, then }) => {
    background(given, and);
    whenCreates(when);
    then(/^veu l'error "(.*)"$/, (message: string) => {
      expect(res.status).toBe(403);
      expect(res.body.error).toBe(message);
    });
    thenSees(and);
  });

  test('La cerca no distingeix majúscules ni accents', ({ given, and, when, then }) => {
    background(given, and);
    whenSearches(when);
    then(/^troba "(.*)"$/, (name: string) => {
      expect(res.body.map((e: { name: string }) => e.name)).toEqual([name]);
    });
  });

  test('Una cerca sense resultats', ({ given, and, when, then }) => {
    background(given, and);
    whenSearches(when);
    then('no troba cap entitat', () => {
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  test('Una entitat arxivada surt de les llistes però no es perd', ({ given, and, when, then }) => {
    background(given, and);
    when(/^el "(.*)" arxiva "(.*)"$/, async (who: string, name: string) => {
      res = await request(app).post(url(`/${await idOf(name)}/archive`)).set(as(who));
      expect(res.status).toBe(200);
    });
    then(/^la "(.*)" no veu cap entitat al compendi$/, async (who: string) => {
      expect(await compendium(who)).toBe('');
    });
    and(/^la "(.*)" encara pot obrir "(.*)"$/, async (who: string, name: string) => {
      const opened = await request(app).get(url(`/${await idOf(name)}`)).set(as(who));
      expect(opened.status).toBe(200);
    });
  });
});
