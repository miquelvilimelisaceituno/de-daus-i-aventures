import { env } from '../../src/config/env';
import { prisma } from '../../src/db/prisma';

/**
 * Buida totes les taules de la BD de test (dda-test).
 * Es crida al principi de cada test perquè tots comencin igual.
 */
export async function resetDb() {
  // Protecció: mai buidar una BD que no sigui la de test.
  if (env.NODE_ENV !== 'test') {
    throw new Error('resetDb només es pot executar amb NODE_ENV=test');
  }

  // Totes les taules de l'esquema public, menys la de Prisma
  // que recorda quines migracions s'han aplicat.
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}
