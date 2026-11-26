import { requireActiveCampaign } from '../middlewares/load-membership';
import * as entitiesController from '../controllers/entities.controller';
import { makeCrudRouter } from './make-crud-router';

/** /api/campaigns/:cid/entities: el compendi (F3). */
export const entitiesRouter = makeCrudRouter(entitiesController.entitiesController);

// Accions que no són CRUD pur: subruta amb un verb (CRUD §3.1).
entitiesRouter.post('/:id/reveal', requireActiveCampaign, entitiesController.reveal);
entitiesRouter.post('/:id/archive', requireActiveCampaign, entitiesController.archive);
entitiesRouter.post('/:id/unarchive', requireActiveCampaign, entitiesController.unarchive);