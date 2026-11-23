import type { Response } from 'express';
import { z } from 'zod';

/** Resposta 400 amb la forma comuna de l'API: { error, fields, general } (D44). */
export function sendValidationError(res: Response, error: z.ZodError) {
  const { formErrors, fieldErrors } = z.flattenError(error);
  res.status(400).json({ error: 'Dades no vàlides', fields: fieldErrors, general: formErrors });
}