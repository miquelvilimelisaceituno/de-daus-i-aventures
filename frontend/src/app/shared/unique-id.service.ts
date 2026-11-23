// src/app/shared/unique-id.service.ts
import { Service } from '@angular/core';

/**
 * Genera identificadors únics per als atributs `id` del DOM
 * (per exemple, per enllaçar un <label> amb el seu <input>).
 * No depèn de l'ordre en què es creen els components ni comparteix estat global.
 */
@Service()
export class UniqueIdService {
  /** Retorna, per exemple, "camp-3f2b8c1e-…". El prefix ha de començar per una lletra. */
  next(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }
}