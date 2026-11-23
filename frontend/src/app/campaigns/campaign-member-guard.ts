import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { CampaignContext } from './campaign-context.service';

/**
 * /c/:id → només si soc membre actiu de la campanya. Si no (o si l'API no respon) → /campanyes.
 * Carrega la campanya al CampaignContext. Només és UX: la protecció real és l'API (403).
 */
export const campaignMemberGuard: CanActivateFn = async (route) => {
  const context = inject(CampaignContext);
  const router = inject(Router);
  const id = campaignIdFrom(route);

  try {
    if (id && (await context.load(id))) return true;
  } catch {
    // Sense connexió o error del servidor: «Les meves campanyes» ja mostra l'error i «Torna-ho a provar».
  }
  return router.createUrlTree(['/campanyes']);
};

/** El :id de la campanya, encara que la ruta sigui una filla (/c/:id/config). */
export function campaignIdFrom(route: ActivatedRouteSnapshot): string | null {
  for (let r: ActivatedRouteSnapshot | null = route; r; r = r.parent) {
    const id = r.paramMap.get('id');
    if (id) return id;
  }
  return null;
}