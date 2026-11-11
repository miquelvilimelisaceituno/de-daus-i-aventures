import { Router, type Response } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/require-auth';
import type { AuthUser } from '../auth/verify-token';
import { prisma } from '../db/prisma';
import { Prisma } from '../generated/prisma/client';

export const meRouter = Router();
meRouter.use(requireAuth);

// Llista blanca de camps que surten de l'API (D33).
const PROFILE_SELECT = { id: true, name: true, avatarUrl: true, isAdmin: true } as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, 'El nom és obligatori')
  .max(40, 'El nom pot tenir com a màxim 40 caràcters');

const createSchema = z.strictObject({ name: nameSchema.optional() });

// strictObject: si arriba un camp que no és a la llista (isAdmin, per exemple) → 400.
const updateSchema = z.strictObject({
  name: nameSchema.optional(),
  avatarUrl: z.url({ protocol: /^https?$/ }).max(500).nullable().optional(),
});

function sendValidationError(res: Response, error: z.ZodError) {
  const { formErrors, fieldErrors } = z.flattenError(error);
  res.status(400).json({ error: 'Dades no vàlides', fields: fieldErrors, general: formErrors });
}

// Si el registre no envia nom: el de Firebase o la part de l'email abans de l'@.
function defaultName(auth: AuthUser): string {
  const name = auth.name ?? auth.email?.split('@')[0] ?? 'Aventurer';
  return name.trim().slice(0, 40) || 'Aventurer';
}

// POST /api/me → crea el perfil al primer login. Si ja existeix, el retorna igual.
meRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const auth = currentUser(req);
  const user = await prisma.user.upsert({
    where: { id: auth.uid },
    create: { id: auth.uid, name: parsed.data.name ?? defaultName(auth) },
    update: {},
    select: PROFILE_SELECT,
  });
  res.json(user);
});

// GET /api/me → el meu perfil (404 si encara no s'ha creat).
meRouter.get('/', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: currentUser(req).uid },
    select: PROFILE_SELECT,
  });
  if (!user) {
    res.status(404).json({ error: 'Perfil no trobat' });
    return;
  }
  res.json(user);
});

// PATCH /api/me → canviar el nom o l'avatar (HU-03).
meRouter.patch('/', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: currentUser(req).uid },
      data: parsed.data,
      select: PROFILE_SELECT,
    });
    res.json(user);
  } catch (err) {
    // P2025: no existeix cap fila amb aquest id
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ error: 'Perfil no trobat' });
      return;
    }
    throw err;
  }
});