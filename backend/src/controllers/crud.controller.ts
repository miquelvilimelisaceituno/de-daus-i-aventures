import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentMember } from '../middlewares/load-membership';
import type { CampaignMember } from '../services/campaign-member';
import type { CrudService } from '../services/crud.service';
import { NotFoundError } from '../services/errors';

// Controlador comú de les 5 rutes CRUD d'un recurs de la campanya (CRUD §3.1).
// Valida la query i el cos amb els esquemes del recurs i respon amb la seva vista.

export interface CrudSchemas<Create, Update, Filters> {
  create: z.ZodType<Create>;
  update: z.ZodType<Update>;
  filters: z.ZodType<Filters>;
}

type View<Row> = (me: CampaignMember, row: Row) => unknown;

/** L'id de la URL. Si no és un UUID (universally unique identifier), el recurs no pot existir → 404 (no un 500 de PostgreSQL). */
export function resourceId(req: Request): string {
  const parsed = z.uuid().safeParse(req.params.id);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

export function makeCrudController<Row, Create, Update, Filters>(
  service: CrudService<Row, Create, Update, Filters>,
  schemas: CrudSchemas<Create, Update, Filters>,
  view: View<Row>,
) {
  return {
    async list(req: Request, res: Response) {
      const me = currentMember(req);
      const rows = await service.list(me, schemas.filters.parse(req.query));
      res.json(rows.map((row) => view(me, row)));
    },

    async get(req: Request, res: Response) {
      const me = currentMember(req);
      res.json(view(me, await service.get(me, resourceId(req))));
    },

    async create(req: Request, res: Response) {
      const me = currentMember(req);
      const row = await service.create(me, () => schemas.create.parse(req.body ?? {}));
      res.status(201).json(view(me, row));
    },

    async update(req: Request, res: Response) {
      const me = currentMember(req);
      const id = resourceId(req);
      const row = await service.update(me, id, () => schemas.update.parse(req.body ?? {}));
      res.json(view(me, row));
    },

    async remove(req: Request, res: Response) {
      await service.remove(currentMember(req), resourceId(req));
      res.status(204).end();
    },
  };
}