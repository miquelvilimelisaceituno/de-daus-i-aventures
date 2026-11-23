import { HttpClient, httpResource } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Campaign, CampaignChanges, NewCampaign, Member, CampaignDetail } from './campaign.model';

@Service()
export class CampaignService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/campaigns`;

  /** Les meves campanyes. Retorna un recurs amb value(), isLoading(), error() i reload(). */
  list() {
    return httpResource<Campaign[]>(() => this.url, { defaultValue: [] });
  }

    /** Detall d'una campanya on soc membre actiu. Si no ho soc (o no existeix) → error 403. */
  get(id: string): Promise<CampaignDetail> {
    return firstValueFrom(this.http.get<CampaignDetail>(`${this.url}/${id}`));
  }

  /** Crea una campanya; en soc el màster (HU-10). */
  create(campaign: NewCampaign): Promise<Campaign> {
    return firstValueFrom(this.http.post<Campaign>(this.url, campaign));
  }

  /** M'uneixo com a jugador amb un codi (HU-12). Els errors 404, 409 i 403 porten el missatge de l'API. */
  join(code: string): Promise<Campaign> {
    return firstValueFrom(this.http.post<Campaign>(`${this.url}/join`, { code }));
  }

    /** Edita la campanya o les invitacions (màster, HU-16). Arxivada → 409. */
  update(id: string, changes: CampaignChanges): Promise<CampaignDetail> {
    return firstValueFrom(this.http.patch<CampaignDetail>(`${this.url}/${id}`, changes));
  }

  /** Codi d'invitació nou; l'antic deixa de funcionar a l'instant (màster, HU-11). */
  async regenerateInviteCode(id: string): Promise<string> {
    const { inviteCode } = await firstValueFrom(
      this.http.post<{ inviteCode: string }>(`${this.url}/${id}/invite-code`, {}),
    );
    return inviteCode;
  }

  /**
   * Membres actius de la campanya. `id` és una funció perquè el recurs es recarregui si canvia;
   * mentre retorni undefined (encara no hi ha campanya) no es fa cap petició.
   */
  members(id: () => string | undefined) {
    return httpResource<Member[]>(
      () => {
        const campaignId = id();
        return campaignId ? `${this.url}/${campaignId}/members` : undefined;
      },
      { defaultValue: [] },
    );
  }

  /** Sortir (userId = jo, HU-15) o expulsar un jugador (màster, HU-14). */
  removeMember(id: string, userId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.url}/${id}/members/${userId}`));
  }
}