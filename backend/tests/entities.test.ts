import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { searchKey } from '../src/db/search-key';
import { prisma } from '../src/db/prisma';
import type { EntityType } from '../src/generated/prisma/enums';
import { resetDb } from './helpers/db';

const app = createApp();

// D21: amb NODE_ENV=test, "test:<uid>" és un token vàlid per a aquest uid.
const as = (uid: string) => ({ Authorization: `Bearer test:${uid}` });

let cid: string;
const url = (path = '') => `/api/campaigns/${cid}/entities${path}`;
const names = (body: { name: string }[]) => body.map((e) => e.name);

/** Les dades es preparen amb Prisma; l'API només es fa servir per a l'acció que es prova. */
function entity(name: string, type: EntityType, extra: { isSecret?: boolean; archivedAt?: Date } = {}) {
  return prisma.entity.create({
    data: { campaignId: cid, type, name, searchName: searchKey(name), isSecret: false, ...extra },
  });
}

beforeEach(async () => {
  await resetDb();
  await prisma.user.createMany({
    data: [
      { id: 'miquel', name: 'Miquel' },
      { id: 'laia', name: 'Laia' },
      { id: 'anna', name: 'Anna' },
    ],
  });
  const campaign = await prisma.campaign.create({
    data: {
      name: 'El final infinit',
      inviteCode: 'DRAC2024',
      memberships: {
        create: [
          { userId: 'miquel', role: 'master' },
          { userId: 'laia', role: 'player' },
        ],
      },
    },
  });
  cid = campaign.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/campaigns/:cid/entities (HU-30)', () => {
  it('the master creates an entity, secret by default', async () => {
    const res = await request(app)
      .post(url())
      .set(as('miquel'))
      .send({ type: 'npc', name: '  Brugal el Vell ', description: 'Taverner de Ponent' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: 'npc',
      name: 'Brugal el Vell',
      description: 'Taverner de Ponent',
      isSecret: true,
      archivedAt: null,
    });
    expect(res.body).not.toHaveProperty('searchName');
    const saved = await prisma.entity.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(saved).toMatchObject({ campaignId: cid, searchName: 'brugal el vell' });
  });

  it('can be created already revealed', async () => {
    const res = await request(app).post(url()).set(as('miquel')).send({ type: 'location', name: 'Ponent', isSecret: false });

    expect(res.status).toBe(201);
    expect(res.body.isSecret).toBe(false);
  });

  it('name and type are required → 400 with the field errors', async () => {
    const res = await request(app).post(url()).set(as('miquel')).send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(['name', 'type']);
    expect(await prisma.entity.count()).toBe(0);
  });

  it('an unknown type → 400', async () => {
    const res = await request(app).post(url()).set(as('miquel')).send({ type: 'dragon', name: 'Smaug' });

    expect(res.status).toBe(400);
  });

  it('a player → 403, even with an empty body, and nothing is created', async () => {
    const res = await request(app).post(url()).set(as('laia')).send({});

    expect(res.status).toBe(403);
    expect(await prisma.entity.count()).toBe(0);
  });

  it('a non-member → 403', async () => {
    const res = await request(app).post(url()).set(as('anna')).send({ type: 'npc', name: 'Brugal' });

    expect(res.status).toBe(403);
  });

  it('an archived campaign is read-only → 409', async () => {
    await prisma.campaign.update({ where: { id: cid }, data: { archivedAt: new Date() } });

    const res = await request(app).post(url()).set(as('miquel')).send({ type: 'npc', name: 'Brugal' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/campaigns/:cid/entities (HU-32, HU-33)', () => {
  beforeEach(async () => {
    await entity('Àlex de Ponent', 'npc');
    await entity('Ponent', 'location');
    await entity('La Mà Negra', 'faction', { isSecret: true });
    await entity('Vell Port', 'location', { archivedAt: new Date() });
  });

  it('the master sees every active entity, sorted by name, without the archived ones', async () => {
    const res = await request(app).get(url()).set(as('miquel'));

    expect(res.status).toBe(200);
    expect(names(res.body)).toEqual(['Àlex de Ponent', 'La Mà Negra', 'Ponent']);
  });

  it('a player does not see secret entities, and isSecret is not sent', async () => {
    const res = await request(app).get(url()).set(as('laia'));

    expect(names(res.body)).toEqual(['Àlex de Ponent', 'Ponent']);
    expect(res.body[0]).not.toHaveProperty('isSecret');
  });

  it('filters by type', async () => {
    const res = await request(app).get(url('?type=location')).set(as('miquel'));

    expect(names(res.body)).toEqual(['Ponent']);
  });

  it('search ignores case and accents', async () => {
    const res = await request(app).get(url(`?q=${encodeURIComponent('ALEX')}`)).set(as('laia'));

    expect(names(res.body)).toEqual(['Àlex de Ponent']);
  });

  it('search does not reveal secret entities to a player', async () => {
    const res = await request(app).get(url('?q=negra')).set(as('laia'));

    expect(res.body).toEqual([]);
  });

  it('no results → empty list', async () => {
    const res = await request(app).get(url('?q=drac')).set(as('miquel'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('the master can list the archived entities apart (HU-35)', async () => {
    const res = await request(app).get(url('?archived=true')).set(as('miquel'));

    expect(names(res.body)).toEqual(['Vell Port']);
  });

  it('a player asking for the archived ones gets the active list', async () => {
    const res = await request(app).get(url('?archived=true')).set(as('laia'));

    expect(names(res.body)).toEqual(['Àlex de Ponent', 'Ponent']);
  });

  it('an unknown type in the filter → 400', async () => {
    const res = await request(app).get(url('?type=dragon')).set(as('miquel'));

    expect(res.status).toBe(400);
  });

  it('only lists the entities of this campaign', async () => {
    const other = await prisma.campaign.create({
      data: { name: 'Una altra', inviteCode: 'ALTRA234', memberships: { create: { userId: 'miquel', role: 'player' } } },
    });
    await prisma.entity.create({
      data: { campaignId: other.id, type: 'npc', name: 'Intrús', searchName: 'intrus', isSecret: false },
    });

    const res = await request(app).get(url()).set(as('miquel'));

    expect(names(res.body)).not.toContain('Intrús');
  });
});

describe('GET /api/campaigns/:cid/entities/:id', () => {
  it('a player can open a revealed entity', async () => {
    const ponent = await entity('Ponent', 'location');

    const res = await request(app).get(url(`/${ponent.id}`)).set(as('laia'));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Ponent');
  });

  it('a secret entity by direct URL → 404 for a player, but the master sees it (HU-32)', async () => {
    const secret = await entity('La Mà Negra', 'faction', { isSecret: true });

    expect((await request(app).get(url(`/${secret.id}`)).set(as('laia'))).status).toBe(404);
    expect((await request(app).get(url(`/${secret.id}`)).set(as('miquel'))).status).toBe(200);
  });

  it('an archived entity can still be opened (old encounters link to it)', async () => {
    const old = await entity('Vell Port', 'location', { archivedAt: new Date() });

    const res = await request(app).get(url(`/${old.id}`)).set(as('laia'));

    expect(res.status).toBe(200);
  });

  it('an entity of another campaign → 404', async () => {
    const other = await prisma.campaign.create({ data: { name: 'Una altra', inviteCode: 'ALTRA234' } });
    const foreign = await prisma.entity.create({
      data: { campaignId: other.id, type: 'npc', name: 'Intrús', searchName: 'intrus', isSecret: false },
    });

    const res = await request(app).get(url(`/${foreign.id}`)).set(as('miquel'));

    expect(res.status).toBe(404);
  });

  it('an id that is not a UUID → 404, not 500', async () => {
    const res = await request(app).get(url('/no-es-un-uuid')).set(as('miquel'));

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/campaigns/:cid/entities/:id (HU-30)', () => {
  it('the master edits the name and the description, and the search follows the new name', async () => {
    const brugal = await entity('Brugal', 'npc');

    const res = await request(app)
      .patch(url(`/${brugal.id}`))
      .set(as('miquel'))
      .send({ name: 'Brugal el Vell', description: null });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Brugal el Vell', description: null });
    const found = await request(app).get(url('?q=vell')).set(as('miquel'));
    expect(names(found.body)).toEqual(['Brugal el Vell']);
  });

  it('the master hides a revealed entity again with isSecret: true', async () => {
    const ponent = await entity('Ponent', 'location');

    await request(app).patch(url(`/${ponent.id}`)).set(as('miquel')).send({ isSecret: true }).expect(200);

    expect((await request(app).get(url(`/${ponent.id}`)).set(as('laia'))).status).toBe(404);
  });

  it('a player editing a revealed entity → 403 and nothing changes', async () => {
    const ponent = await entity('Ponent', 'location');

    const res = await request(app).patch(url(`/${ponent.id}`)).set(as('laia')).send({ name: 'Llevant' });

    expect(res.status).toBe(403);
    expect((await prisma.entity.findUniqueOrThrow({ where: { id: ponent.id } })).name).toBe('Ponent');
  });

  it('a player editing a secret entity → 404, as if it did not exist', async () => {
    const secret = await entity('La Mà Negra', 'faction', { isSecret: true });

    const res = await request(app).patch(url(`/${secret.id}`)).set(as('laia')).send({ name: 'x' });

    expect(res.status).toBe(404);
  });

  it('unknown fields → 400', async () => {
    const ponent = await entity('Ponent', 'location');

    const res = await request(app).patch(url(`/${ponent.id}`)).set(as('miquel')).send({ campaignId: 'x' });

    expect(res.status).toBe(400);
  });
});

describe('entity actions: reveal, archive and unarchive', () => {
  it('the master reveals a secret entity and the player sees it at once (HU-32)', async () => {
    const secret = await entity('La Mà Negra', 'faction', { isSecret: true });

    const res = await request(app).post(url(`/${secret.id}/reveal`)).set(as('miquel'));

    expect(res.status).toBe(200);
    expect(res.body.isSecret).toBe(false);
    expect(names((await request(app).get(url()).set(as('laia'))).body)).toContain('La Mà Negra');
  });

  it('a player cannot reveal → 404 if secret, 403 if already visible', async () => {
    const secret = await entity('La Mà Negra', 'faction', { isSecret: true });
    const ponent = await entity('Ponent', 'location');

    expect((await request(app).post(url(`/${secret.id}/reveal`)).set(as('laia'))).status).toBe(404);
    expect((await request(app).post(url(`/${ponent.id}/archive`)).set(as('laia'))).status).toBe(403);
  });

  it('archiving hides it from the lists; unarchiving brings it back (HU-35)', async () => {
    const ponent = await entity('Ponent', 'location');

    const archived = await request(app).post(url(`/${ponent.id}/archive`)).set(as('miquel'));
    expect(archived.status).toBe(200);
    expect(archived.body.archivedAt).not.toBeNull();
    expect(names((await request(app).get(url()).set(as('laia'))).body)).toEqual([]);

    await request(app).post(url(`/${ponent.id}/unarchive`)).set(as('miquel')).expect(200);
    expect(names((await request(app).get(url()).set(as('laia'))).body)).toEqual(['Ponent']);
  });
});

describe('DELETE /api/campaigns/:cid/entities/:id (HU-30)', () => {
  it('the master deletes an entity → 204', async () => {
    const brugal = await entity('Brugal', 'npc');

    const res = await request(app).delete(url(`/${brugal.id}`)).set(as('miquel'));

    expect(res.status).toBe(204);
    expect(await prisma.entity.count()).toBe(0);
  });

  it('a player → 403 and the entity is still there', async () => {
    const brugal = await entity('Brugal', 'npc');

    const res = await request(app).delete(url(`/${brugal.id}`)).set(as('laia'));

    expect(res.status).toBe(403);
    expect(await prisma.entity.count()).toBe(1);
  });

  it('an entity that does not exist → 404', async () => {
    const res = await request(app).delete(url('/0196f3a2-0000-7000-8000-000000000000')).set(as('miquel'));

    expect(res.status).toBe(404);
  });

  it('deleting the campaign deletes its entities in cascade', async () => {
    await entity('Brugal', 'npc');

    await prisma.campaign.delete({ where: { id: cid } });

    expect(await prisma.entity.count()).toBe(0);
  });
});

describe('searchKey', () => {
  it('lowercases and removes accents and the middle dot', () => {
    // «col·lecció» i «colleccio» donen la mateixa clau: la cerca troba l'una amb l'altra.
    expect(searchKey('  Àlex de la COL·LECCIÓ Ç ')).toBe('alex de la colleccio c');
  });
});
