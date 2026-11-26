import { HttpError } from '../http/http-error';

/** L'usuari no té perfil: POST /api/me no s'ha cridat. El fan servir diversos serveis. */
export class ProfileNotFoundError extends HttpError {
  constructor() {
    super(404, 'Perfil no trobat');
  }
}

/** No existeix o no el pots veure: per a un jugador, un recurs secret no existeix (D3). */
export class NotFoundError extends HttpError {
  constructor(message = 'No trobat') {
    super(404, message);
  }
}

/** El rol no permet l'acció (per exemple, un jugador que vol crear o editar). */
export class ForbiddenError extends HttpError {
  constructor() {
    super(403, 'No tens permís per fer això');
  }
}