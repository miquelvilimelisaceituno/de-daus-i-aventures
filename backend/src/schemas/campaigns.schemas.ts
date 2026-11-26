import { z } from 'zod';

const nameSchema = z
  .string()
  .trim()
  .min(3, 'El nom ha de tenir com a mínim 3 caràcters')
  .max(60, 'El nom pot tenir com a màxim 60 caràcters');
const descriptionSchema = z.string().trim().max(2000).nullable().optional();
const imageUrlSchema = z.url({ protocol: /^https?$/ }).max(500).nullable().optional();

/** POST /api/campaigns. strictObject: intentar triar el codi → 400. */
export const createCampaignSchema = z.strictObject({
  name: nameSchema,
  description: descriptionSchema,
  imageUrl: imageUrlSchema,
});

/** PATCH /api/campaigns/:cid. Tot opcional. El codi es regenera amb una acció pròpia (HU-11). */
export const updateCampaignSchema = z.strictObject({
  name: nameSchema.optional(),
  description: descriptionSchema,
  imageUrl: imageUrlSchema,
  inviteOpen: z.boolean().optional(),
  maxPlayers: z
    .int('Ha de ser un nombre enter')
    .min(1, 'Com a mínim 1 jugador')
    .max(12, 'Com a màxim 12 jugadors')
    .optional(),
});

/** POST /api/campaigns/join. */
export const joinCampaignSchema = z.strictObject({
  code: z.string().trim().min(1, 'Escriu el codi').max(20),
});

export type CreateCampaign = z.infer<typeof createCampaignSchema>;
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;