import { prisma } from '../db/prisma';
import { searchKey } from '../db/search-key';
import type { Db } from '../db/types';
import type { Prisma } from '../generated/prisma/client';
import type { CreateEntity, EntityFilters, UpdateEntity } from '../schemas/entities.schemas';

// Accés a la taula entities. Només Prisma: cap regla de negoci.
// Totes les consultes porten campaignId: una entitat d'una altra campanya no existeix.

const ENTITY_SELECT = {
  id: true,
  type: true,
  name: true,
  description: true,
  imageUrl: true,
  isSecret: true,
  mapX: true,
  mapY: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.EntitySelect;

export type EntityRow = Prisma.EntityGetPayload<{ select: typeof ENTITY_SELECT }>;

/** Què ha d'amagar la llista a qui la demana (ho decideix la policy). */
export interface EntityScope {
  revealedOnly: boolean;
  /** El compendi de les arxivades: només el màster. */
  allowArchived: boolean;
}

export function findMany(campaignId: string, filters: EntityFilters, scope: EntityScope, db: Db = prisma) {
  const q = filters.q ? searchKey(filters.q) : '';
  return db.entity.findMany({
    where: {
      campaignId,
      type: filters.type,
      archivedAt: filters.archived && scope.allowArchived ? { not: null } : null,
      ...(scope.revealedOnly && { isSecret: false }),
      ...(q && { searchName: { contains: q } }),
    },
    orderBy: [{ searchName: 'asc' }, { id: 'asc' }],
    select: ENTITY_SELECT,
  });
}

export function findById(campaignId: string, id: string, db: Db = prisma) {
  return db.entity.findUnique({ where: { id_campaignId: { id, campaignId } }, select: ENTITY_SELECT });
}

export function create(campaignId: string, data: CreateEntity, db: Db = prisma) {
  return db.entity.create({
    data: { ...data, campaignId, searchName: searchKey(data.name) },
    select: ENTITY_SELECT,
  });
}

/** També per revelar, amagar i arxivar: són canvis d'un camp. */
export function update(
  campaignId: string,
  id: string,
  data: UpdateEntity & { archivedAt?: Date | null },
  db: Db = prisma,
) {
  return db.entity.update({
    where: { id_campaignId: { id, campaignId } },
    data: { ...data, ...(data.name !== undefined && { searchName: searchKey(data.name) }) },
    select: ENTITY_SELECT,
  });
}

export async function remove(campaignId: string, id: string, db: Db = prisma) {
  await db.entity.delete({ where: { id_campaignId: { id, campaignId } } });
}