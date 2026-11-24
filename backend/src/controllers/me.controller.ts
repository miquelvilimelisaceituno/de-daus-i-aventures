import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/require-auth';
import { createProfileSchema, updateProfileSchema } from '../schemas/me.schemas';
import * as meService from '../services/me.service';

// Controlador de /api/me: llegeix la petició, valida el cos, crida el servei i respon.
// Un cos no vàlid llança ZodError i app.ts el converteix en 400 (D44).

/** POST /api/me → crea el perfil al primer login. Si ja existeix, el retorna igual. */
export async function create(req: Request, res: Response) {
  const { name } = createProfileSchema.parse(req.body ?? {});
  res.json(await meService.ensureProfile(currentUser(req), name));
}

/** GET /api/me → el meu perfil (404 si encara no s'ha creat). */
export async function get(req: Request, res: Response) {
  res.json(await meService.getProfile(currentUser(req).uid));
}

/** PATCH /api/me → canviar el nom o l'avatar (HU-03). */
export async function update(req: Request, res: Response) {
  const data = updateProfileSchema.parse(req.body ?? {});
  res.json(await meService.updateProfile(currentUser(req).uid, data));
}