import { config } from 'dotenv';
import { z } from 'zod';

// En mode test (Jest posa NODE_ENV=test) es llegeix .env.test, que apunta a dda-test.
// Si una variable ja existeix (per exemple, a la CI o a Render), dotenv no la sobreescriu.
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  quiet: true,
});

const FIREBASE_VARS = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'Ha de ser una URL de PostgreSQL'),
    // Orígens que poden llegir l'API des del navegador, separats per comes.
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:4200')
      .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),

    // Firebase Admin (compte de servei). En mode test no calen: els tokens són simulats (D21).
    FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_CLIENT_EMAIL: z.email().optional(),
    // Al .env i a Render els salts de línia de la clau arriben com a "\n" literals.
    FIREBASE_PRIVATE_KEY: z
      .string()
      .min(1)
      .transform((key) => key.replace(/\\n/g, '\n'))
      .optional(),
  })
  .superRefine((vars, ctx) => {
    if (vars.NODE_ENV === 'test') return;
    for (const key of FIREBASE_VARS) {
      if (!vars[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'Obligatòria fora dels tests' });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables d'entorn no vàlides:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
