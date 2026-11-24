import { prisma } from './prisma';
import type { Db } from './types';

/**
 * Executa `work` dins d'una transacció: si llança un error, no es desa res.
 * Els serveis la fan servir per agrupar operacions de diversos repositoris
 * sense haver d'importar Prisma.
 */
export function inTransaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
  return prisma.$transaction((tx) => work(tx));
}