import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'Ha de ser una URL de PostgreSQL'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables d'entorn no vàlides:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
