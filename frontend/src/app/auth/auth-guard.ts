import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Rutes privades: sense sessió → /login?returnUrl=<on anava>.
 * Només és UX: la protecció real és l'API, que respon 401 sense token (MVP §6).
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenSettled();
  if (auth.isSignedIn()) return true;

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};