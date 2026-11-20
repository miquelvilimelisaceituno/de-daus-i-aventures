import { prisma } from '../db/prisma';

/**
 * La pertinença del màster d'una campanya.
 * Mai findUnique({ where: { campaignId } }): Prisma creu que campaignId és únic per
 * l'índex parcial (D46) i retornaria qualsevol membre, també un jugador.
 */
export function findMaster(campaignId: string) {
  return prisma.membership.findFirst({ where: { campaignId, role: 'master' } });
}