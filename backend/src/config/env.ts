import { config } from 'dotenv';
import { z } from 'zod';

// En mode test (Jest posa NODE_ENV=test) es llegeix .env.test, que apunta a dda-test.
// Si una variable ja existeix (per exemple, a la CI o a Render), dotenv no la sobreescriu.
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  quiet: true,
});

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
