import { HttpError } from '../http/http-error';

/** L'usuari no té perfil: POST /api/me no s'ha cridat. El fan servir diversos serveis. */
export class ProfileNotFoundError extends HttpError {
  constructor() {
    super(404, 'Perfil no trobat');
  }
}