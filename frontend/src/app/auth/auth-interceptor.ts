import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AUTH_GATEWAY } from './auth-gateway';

const API = environment.apiUrl;

/** Afegeix «Authorization: Bearer <token>» a les peticions a la nostra API, i a cap altra. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const toApi = req.url === API || req.url.startsWith(`${API}/`);
  if (!toApi) return next(req);

  const gateway = inject(AUTH_GATEWAY);
  return from(gateway.getIdToken()).pipe(
    switchMap((token) =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req),
    ),
  );
};
