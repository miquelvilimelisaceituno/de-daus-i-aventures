import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetDb } from './helpers/db';

const app = createApp();

// D21: con NODE_ENV=test, "test:<uid>" es un token válido para ese uid.
const as = (uid: string) => ({ Authorization: `Bearer test:${uid}` });

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('requireAuth', () => {
  it('sense token → 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('token no vàlid → 401', async () => {
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer inventat');
    expect(res.status).toBe(401);
  });

  it('capçalera sense "Bearer " → 401', async () => {
    const res = await request(app).get('/api/me').set('Authorization', 'test:pau');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/me', () => {
  it('crea el perfil amb el nom enviat', async () => {
    const res = await request(app).post('/api/me').set(as('pau')).send({ name: 'Pau' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'pau', name: 'Pau', avatarUrl: null, isAdmin: false });
    expect(await prisma.user.count()).toBe(1);
  });

  it("sense nom, fa servir la part de l'email abans de l'@", async () => {
    const res = await request(app).post('/api/me').set(as('pau')).send({});

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('pau');
  });

  it('és idempotent: el segon cop no duplica ni canvia res', async () => {
    await request(app).post('/api/me').set(as('pau')).send({ name: 'Pau' });
    const res = await request(app).post('/api/me').set(as('pau')).send({ name: 'Un altre' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Pau');
    expect(await prisma.user.count()).toBe(1);
  });

  it('nom de més de 40 caràcters → 400 amb error al camp name', async () => {
    const res = await request(app).post('/api/me').set(as('pau')).send({ name: 'a'.repeat(41) });

    expect(res.status).toBe(400);
    expect(res.body.fields.name).toBeDefined();
    expect(await prisma.user.count()).toBe(0);
  });
});

describe('GET /api/me', () => {
  it('404 si el perfil encara no existeix', async () => {
    const res = await request(app).get('/api/me').set(as('pau'));
    expect(res.status).toBe(404);
  });

  it("retorna el meu perfil i no el d'un altre", async () => {
    await prisma.user.createMany({
      data: [
        { id: 'pau', name: 'Pau' },
        { id: 'anna', name: 'Anna' },
      ],
    });

    const res = await request(app).get('/api/me').set(as('anna'));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'anna', name: 'Anna' });
  });
});

describe('PATCH /api/me', () => {
  beforeEach(async () => {
    await prisma.user.create({ data: { id: 'pau', name: 'Pau' } });
  });

  it("canvia el nom i l'avatar", async () => {
    const res = await request(app)
      .patch('/api/me')
      .set(as('pau'))
      .send({ name: 'Pau el Bard', avatarUrl: 'https://example.com/pau.png' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Pau el Bard', avatarUrl: 'https://example.com/pau.png' });
  });

  it('nom només amb espais → 400', async () => {
    const res = await request(app).patch('/api/me').set(as('pau')).send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('isAdmin → 400 i no canvia res a la BD', async () => {
    const res = await request(app).patch('/api/me').set(as('pau')).send({ isAdmin: true });

    expect(res.status).toBe(400);
    expect(res.body.general.join(' ')).toMatch(/isAdmin/);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: 'pau' } });
    expect(user.isAdmin).toBe(false);
  });

  it('avatar amb javascript: → 400', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set(as('pau'))
      .send({ avatarUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
  });

  it("null treu l'avatar", async () => {
    await prisma.user.update({ where: { id: 'pau' }, data: { avatarUrl: 'https://example.com/a.png' } });

    const res = await request(app).patch('/api/me').set(as('pau')).send({ avatarUrl: null });

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBeNull();
  });

  it('404 si el perfil no existeix', async () => {
    const res = await request(app).patch('/api/me').set(as('anna')).send({ name: 'Anna' });
    expect(res.status).toBe(404);
  });
});