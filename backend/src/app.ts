import express, { type ErrorRequestHandler } from 'express';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

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
