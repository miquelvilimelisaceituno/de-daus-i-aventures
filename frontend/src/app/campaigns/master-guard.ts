import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CampaignContext } from './campaign-context.service';
import { campaignIdFrom } from './campaign-member-guard';

/**
 * Rutes només per al màster (/c/:id/config). Un jugador torna a l'inici de la campanya.
 * Només és UX: l'API respon 403 a un jugador (requireRole('master')).
 */
export const masterGuard: CanActivateFn = async (route) => {
  const context = inject(CampaignContext);
  const router = inject(Router);
  const id = campaignIdFrom(route);
  if (!id) return router.createUrlTree(['/campanyes']);

  try {
    if ((await context.ensure(id)) && context.isMaster()) return true;
  } catch {
    // Igual que el campaignMemberGuard: sense resposta, no es pot saber si soc el màster.
  }
  return router.createUrlTree(['/c', id]);
};