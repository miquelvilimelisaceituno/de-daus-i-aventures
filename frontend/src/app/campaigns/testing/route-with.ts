import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';

/** Snapshot de ruta mínim per als tests dels guards: només paramMap i parent. */
export function routeWith(params: Record<string, string>, parent: ActivatedRouteSnapshot | null = null) {
  return { paramMap: convertToParamMap(params), parent } as unknown as ActivatedRouteSnapshot;
}