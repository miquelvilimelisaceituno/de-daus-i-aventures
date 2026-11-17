import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/** /login i /register: si ja hi ha sessió, no té sentit mostrar-les → /campanyes. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenSettled();
  return auth.isSignedIn() ? router.createUrlTree(['/campanyes']) : true;
};
