import type { Request, Response } from 'express';
import { currentMember } from '../middlewares/load-membership';
import {
  createEntitySchema,
  entityFiltersSchema,
  updateEntitySchema,
} from '../schemas/entities.schemas';
import * as entities from '../services/entities.service';
import { toEntityView } from '../views/entity.view';
import { makeCrudController, resourceId } from './crud.controller';

/** Les 5 rutes estàndard del compendi (HU-30, HU-33). */
export const entitiesController = makeCrudController(
  entities.entitiesService,
  { create: createEntitySchema, update: updateEntitySchema, filters: entityFiltersSchema },
  toEntityView,
);

type Action = typeof entities.reveal;

/** Una acció del màster sobre una entitat (revelar, arxivar…) que respon amb l'entitat. */
function action(run: Action) {
  return async (req: Request, res: Response) => {
    const me = currentMember(req);
    res.json(toEntityView(me, await run(me, resourceId(req))));
  };
}

export const reveal = action(entities.reveal);
export const archive = action(entities.archive);
export const unarchive = action(entities.unarchive);