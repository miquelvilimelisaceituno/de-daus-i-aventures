import type { CampaignMember } from './campaign-member';
import { ForbiddenError, NotFoundError } from './errors';

// Peces comunes dels recursos d'una campanya (CRUD §3). Cada recurs només aporta
// el seu repositori i la seva policy; les regles de 403 i 404 són les mateixes per a tots.

/**
 * Qui pot fer què amb un recurs. És l'única cosa que canvia d'un recurs a un altre (CRUD §3.3).
 * `Scope` és el que la llista ha d'amagar a aquest membre (per exemple, els secrets per a un jugador).
 */
export interface Policy<Row, Scope> {
  listScope(me: CampaignMember): Scope;
  /** false → 404, no 403: per a un jugador, un recurs ocult no existeix (D3). */
  canRead(me: CampaignMember, row: Row): boolean;
  canCreate(me: CampaignMember): boolean;
  canUpdate(me: CampaignMember, row: Row): boolean;
  canDelete(me: CampaignMember, row: Row): boolean;
}

/**
 * Accés a les dades d'un recurs, sempre dins d'una campanya.
 * El repositori tradueix `Filters` i `Scope` a la consulta de Prisma.
 */
export interface CrudRepository<Row, Create, Update, Filters, Scope> {
  findMany(campaignId: string, filters: Filters, scope: Scope): Promise<Row[]>;
  findById(campaignId: string, id: string): Promise<Row | null>;
  create(campaignId: string, data: Create): Promise<Row>;
  update(campaignId: string, id: string, data: Update): Promise<Row>;
  remove(campaignId: string, id: string): Promise<void>;
}

/**
 * `create` i `update` reben les dades com una funció (`input`) que les valida:
 * el servei la crida DESPRÉS de comprovar els permisos, amb l'ordre de CRUD §3.2
 * (qui ets → què pots fer → dades vàlides). Un jugador que envia un cos buit rep 403, no 400.
 */
export interface CrudService<Row, Create, Update, Filters> {
  list(me: CampaignMember, filters: Filters): Promise<Row[]>;
  get(me: CampaignMember, id: string): Promise<Row>;
  create(me: CampaignMember, input: () => Create): Promise<Row>;
  update(me: CampaignMember, id: string, input: () => Update): Promise<Row>;
  remove(me: CampaignMember, id: string): Promise<void>;
}

/**
 * Servei CRUD a partir d'un repositori i una policy.
 * Ordre de les comprovacions: existeix i el pots veure (404) → el pots tocar (403).
 * Així un jugador que intenta editar una entitat secreta rep 404, com si no existís.
 */
export function makeCrudService<Row, Create, Update, Filters, Scope>(
  repository: CrudRepository<Row, Create, Update, Filters, Scope>,
  policy: Policy<Row, Scope>,
): CrudService<Row, Create, Update, Filters> {
  async function get(me: CampaignMember, id: string) {
    const row = await repository.findById(me.campaignId, id);
    if (!row || !policy.canRead(me, row)) throw new NotFoundError();
    return row;
  }

  return {
    list: (me, filters) => repository.findMany(me.campaignId, filters, policy.listScope(me)),

    get,

    async create(me, input) {
      if (!policy.canCreate(me)) throw new ForbiddenError();
      return repository.create(me.campaignId, input());
    },

    async update(me, id, input) {
      const row = await get(me, id);
      if (!policy.canUpdate(me, row)) throw new ForbiddenError();
      return repository.update(me.campaignId, id, input());
    },

    async remove(me, id) {
      const row = await get(me, id);
      if (!policy.canDelete(me, row)) throw new ForbiddenError();
      await repository.remove(me.campaignId, id);
    },
  };
}