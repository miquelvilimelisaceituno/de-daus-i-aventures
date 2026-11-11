import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { env } from './config/env';
import { campaignsRouter } from './routes/campaigns';
import { meRouter } from './routes/me';


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

  // Errors no controlats
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Error intern del servidor' });
  };
  app.use(errorHandler);

  return app;
}
