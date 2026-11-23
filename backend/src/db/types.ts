import type { Prisma, PrismaClient } from '../generated/prisma/client';

/**
 * Qualsevol client de Prisma: el normal o el d'una transacció (`tx`).
 * Els repositoris el reben com a paràmetre opcional perquè un servei pugui
 * fer diverses operacions dins de la mateixa transacció.
 */
export type Db = PrismaClient | Prisma.TransactionClient;