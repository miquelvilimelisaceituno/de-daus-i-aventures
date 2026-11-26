import { Router } from 'express';
import * as meController from '../controllers/me.controller';
import { requireAuth } from '../middlewares/require-auth';

/** /api/me: només connecta cada ruta amb els seus middlewares i el controlador. */
export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.post('/', meController.create);
meRouter.get('/', meController.get);
meRouter.patch('/', meController.update);