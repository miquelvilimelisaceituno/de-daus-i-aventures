import { type RequestHandler, Router } from 'express';
import { requireActiveCampaign } from '../middlewares/load-membership';

interface CrudHandlers {
  list: RequestHandler;
  get: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
}

/**
 * Les 5 rutes estàndard d'un recurs de la campanya (CRUD §3.1). Es munta dins de
 * /api/campaigns/:cid, que ja ha passat per requireAuth i loadMembership.
 * Les escriptures exigeixen una campanya activa (409 si està arxivada).
 * Els permisos per rol els decideix la policy del recurs, dins del servei.
 */
export function makeCrudRouter(controller: CrudHandlers) {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', requireActiveCampaign, controller.create);
  router.patch('/:id', requireActiveCampaign, controller.update);
  router.delete('/:id', requireActiveCampaign, controller.remove);
  return router;
}