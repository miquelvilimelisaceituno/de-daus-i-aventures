import { HttpClient, httpResource } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Campaign, NewCampaign, CampaignDetail } from './campaign.model';

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
}