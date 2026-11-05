import { afterAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('CORS', () => {
  it("permet l'origen del frontend local", async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:4200');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('no permet un origen desconegut', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://web-maliciosa.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
