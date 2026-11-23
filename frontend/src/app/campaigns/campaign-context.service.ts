import { HttpErrorResponse } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { CampaignDetail } from './campaign.model';
import { CampaignService } from './campaign.service';

/**
 * La campanya on és l'usuari ara (/c/:id), compartida per totes les pàgines de dins
 * (barra inferior, inici, configuració…). La carrega el campaignMemberGuard en entrar.
 */
@Service()
export class CampaignContext {
  private readonly campaignService = inject(CampaignService);

  private readonly _campaign = signal<CampaignDetail | null>(null);
  readonly campaign = this._campaign.asReadonly();
  readonly isMaster = computed(() => this._campaign()?.role === 'master');
  readonly isArchived = computed(() => this._campaign()?.archivedAt != null);

  /** Última campanya demanada: si arriba tard la resposta d'una altra, es descarta. */
  private requestedId: string | null = null;
  /** Petició en curs, per no repetir-la si dos guards la demanen alhora. */
  private inFlight: Promise<boolean> | null = null;

  /**
   * Carrega la campanya des de l'API (sempre fresca: potser m'han expulsat).
   * Resol `true` si soc membre actiu i `false` si l'API respon 403 o 404.
   * Qualsevol altre error (sense connexió, 500) es torna a llançar.
   */
  load(id: string): Promise<boolean> {
    if (this.requestedId === id && this.inFlight) return this.inFlight;

    this.requestedId = id;
    const request = this.fetch(id);
    this.inFlight = request;
    const clear = () => {
      if (this.inFlight === request) this.inFlight = null;
    };
    request.then(clear, clear);
    return request;
  }

  /** Com load(), però si ja tinc aquesta campanya no la torna a demanar. */
  ensure(id: string): Promise<boolean> {
    return this._campaign()?.id === id ? Promise.resolve(true) : this.load(id);
  }

  private async fetch(id: string): Promise<boolean> {
    try {
      const campaign = await this.campaignService.get(id);
      if (this.requestedId === id) this._campaign.set(campaign);
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 403 || error.status === 404)) {
        if (this.requestedId === id) this._campaign.set(null);
        return false;
      }
      throw error;
    }
  }
}