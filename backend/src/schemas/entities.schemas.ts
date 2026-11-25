import { z } from 'zod';

export const ENTITY_TYPES = ['npc', 'location', 'faction'] as const;

const typeSchema = z.enum(ENTITY_TYPES, 'Tria un tipus: PNJ, localització o facció');
const nameSchema = z
  .string()
  .trim()
  .min(1, 'El nom és obligatori')
  .max(80, 'El nom pot tenir com a màxim 80 caràcters');
const descriptionSchema = z.string().trim().max(5000).nullable().optional();
const imageUrlSchema = z.url({ protocol: /^https?$/ }).max(500).nullable().optional();

/** POST .../entities. Nom i tipus obligatoris (HU-30); secreta si no es diu el contrari. */
export const createEntitySchema = z.strictObject({
  type: typeSchema,
  name: nameSchema,
  description: descriptionSchema,
  imageUrl: imageUrlSchema,
  isSecret: z.boolean().optional(),
});

/** PATCH .../entities/:id. Tot opcional; amagar-la de nou és isSecret: true. */
export const updateEntitySchema = z.strictObject({
  type: typeSchema.optional(),
  name: nameSchema.optional(),
  description: descriptionSchema,
  imageUrl: imageUrlSchema,
  isSecret: z.boolean().optional(),
});

/** GET .../entities?type=npc&q=text&archived=true. Paràmetres desconeguts: s'ignoren. */
export const entityFiltersSchema = z.object({
  type: typeSchema.optional(),
  q: z.string().trim().max(80).optional(),
  // Només el màster: el compendi de les arxivades.
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type CreateEntity = z.infer<typeof createEntitySchema>;
export type UpdateEntity = z.infer<typeof updateEntitySchema>;
export type EntityFilters = z.infer<typeof entityFiltersSchema>;