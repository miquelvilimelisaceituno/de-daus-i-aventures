import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Igual que src/config/env.ts: amb NODE_ENV=test es fa servir dda-test.
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  quiet: true,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
