import { Router } from 'express';
import * as campaignsController from '../controllers/campaigns.controller';
import * as membersController from '../controllers/members.controller';
import {
  loadMembership,
  requireActiveCampaign,
  requireRole,
} from '../middlewares/load-membership';
import { requireAuth } from '../middlewares/require-auth';

/**
 * /api/campaigns: només connecta cada ruta amb els seus middlewares i el controlador.
 * Ordre de cada cadena (CRUD §3.2): qui ets (requireAuth) → ets membre (loadMembership)
 * → què pots fer (requireRole, requireActiveCampaign) → dades vàlides (controlador).
 */
export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

campaignsRouter.get('/', campaignsController.listMine);
campaignsRouter.post('/', campaignsController.create);
// Les rutes amb un nom fix han d'anar ABANS de /:cid; si no, loadMembership
// les interpretaria com un :cid i respondria 403.
campaignsRouter.post('/join', campaignsController.join);

// Rutes d'una campanya concreta: /api/campaigns/:cid/...
const campaignRouter = Router({ mergeParams: true });
campaignsRouter.use('/:cid', loadMembership, campaignRouter);

const masterOnly = [requireRole('master'), requireActiveCampaign];

campaignRouter.get('/', campaignsController.getDetail);
campaignRouter.patch('/', ...masterOnly, campaignsController.update);
campaignRouter.post('/invite-code', ...masterOnly, campaignsController.regenerateInviteCode);
campaignRouter.get('/members', membersController.list);
campaignRouter.delete('/members/:userId', membersController.remove);