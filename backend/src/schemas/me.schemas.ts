import { z } from 'zod';

const nameSchema = z
  .string()
  .trim()
  .min(1, 'El nom és obligatori')
  .max(40, 'El nom pot tenir com a màxim 40 caràcters');

/** POST /api/me. */
export const createProfileSchema = z.strictObject({ name: nameSchema.optional() });

/** PATCH /api/me. strictObject: un camp que no és a la llista (isAdmin, per exemple) → 400. */
export const updateProfileSchema = z.strictObject({
  name: nameSchema.optional(),
  avatarUrl: z.url({ protocol: /^https?$/ }).max(500).nullable().optional(),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;