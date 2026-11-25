// Formes de les respostes de /api/campaigns/:cid/entities (backend/src/views/entity.view.ts).

export type EntityType = 'npc' | 'location' | 'faction';

/** Com es mostra cada tipus a la interfície, en singular i en plural (filtres). */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  npc: 'PNJ',
  location: 'Localització',
  faction: 'Facció',
};
export const ENTITY_TYPE_PLURALS: Record<EntityType, string> = {
  npc: 'PNJ',
  location: 'Localitzacions',
  faction: 'Faccions',
};
export const ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABELS) as EntityType[];

/** Una entitat del compendi. */
export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Només arriba al màster: el jugador només rep entitats revelades. */
  isSecret?: boolean;
  /** Data ISO; null si no està arxivada. */
  archivedAt: string | null;
}

/** Filtres de la llista (GET .../entities?type=&q=&archived=). */
export interface EntityFilters {
  type?: EntityType;
  q?: string;
  /** Només el màster: el compendi de les arxivades. */
  archived?: boolean;
}

/** Cos de POST (crear) i de PATCH (editar). */
export interface EntityData {
  type: EntityType;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isSecret: boolean;
}