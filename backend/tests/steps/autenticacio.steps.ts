import path from 'node:path';
import { afterAll, beforeEach, expect } from '@jest/globals';
import { defineFeature, loadFeature } from 'jest-cucumber';
import request, { type Response } from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/prisma';
import { resetDb } from '../helpers/db';

const feature = loadFeature(path.join(__dirname, '../../../features/autenticacio.feature'));
const app = createApp();

defineFeature(feature, (test) => {
  let uid = '';
  let res: Response;

  beforeEach(async () => {
    await resetDb();
    uid = '';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const haIniciatSessio = /^l'usuari "(.*)" ha iniciat sessió a Firebase$/;
  const respostaAmbCodi = /^la resposta té el codi (\d+)$/;
  const token = () => ({ Authorization: `Bearer test:${uid}` });

  test('Primer login: es crea el perfil', ({ given, when, then, and }) => {
    given(haIniciatSessio, (id: string) => {
      uid = id;
    });

    when(/^envia el seu perfil amb el nom "(.*)"$/, async (name: string) => {
      res = await request(app).post('/api/me').set(token()).send({ name });
    });

    then(respostaAmbCodi, (code: string) => {
      expect(res.status).toBe(Number(code));
    });

    and(/^existeix l'usuari "(.*)" amb el nom "(.*)"$/, async (id: string, name: string) => {
      const user = await prisma.user.findUnique({ where: { id } });
      expect(user?.name).toBe(name);
    });
  });

  test("Petició a l'API sense iniciar sessió", ({ when, then }) => {
    when('es consulta el perfil sense token', async () => {
      res = await request(app).get('/api/me');
    });

    then(respostaAmbCodi, (code: string) => {
      expect(res.status).toBe(Number(code));
    });
  });

  test('Nom massa llarg', ({ given, and, when, then }) => {
    given(haIniciatSessio, (id: string) => {
      uid = id;
    });

    and('ja té el perfil creat', async () => {
      await prisma.user.create({ data: { id: uid, name: 'Pau' } });
    });

    when('canvia el seu nom per un de 41 caràcters', async () => {
      res = await request(app).patch('/api/me').set(token()).send({ name: 'a'.repeat(41) });
    });

    then(respostaAmbCodi, (code: string) => {
      expect(res.status).toBe(Number(code));
    });
  });
});