import type { Request, RequestHandler } from 'express';
import { verifyToken, type AuthUser } from './verify-token';

// Afegeix req.auth al tipus Request d'Express.
declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

/** Exigeix "Authorization: Bearer <token>". Si falta o no és vàlid → 401. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    res.status(401).json({ error: 'Cal iniciar sessió' });
    return;
  }

  try {
    req.auth = await verifyToken(token);
  } catch {
    res.status(401).json({ error: 'La sessió no és vàlida o ha caducat' });
    return;
  }

  next();
};

/** L'usuari autenticat. Només es pot cridar en rutes que passen per requireAuth. */
export function currentUser(req: Request): AuthUser {
  if (!req.auth) throw new Error('Falta requireAuth en aquesta ruta');
  return req.auth;
}