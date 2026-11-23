import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { env } from './config/env';
import { HttpError } from './http/http-error';
import { sendValidationError } from './http/validation';
import { campaignsRouter } from './routes/campaigns';
import { meRouter } from './routes/me.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/me', meRouter);

  // Qualsevol ruta que no existeix
  app.use((_req, res) => {
    res.status(404).json({ error: 'No trobat' });
  });

  // Errors. Express 5 hi envia també els errors dels controladors async.
  // - ZodError: un controlador ha validat un cos no vàlid → 400 { error, fields, general } (D44).
  // - HttpError: un servei ha aplicat una regla de negoci → el seu codi.
  // - La resta són errors no controlats → 500.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof z.ZodError) {
      sendValidationError(res, err);
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Error intern del servidor' });
  };
  app.use(errorHandler);

  return app;
}