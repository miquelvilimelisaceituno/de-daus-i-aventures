import { httpResource } from '@angular/common/http';
import { Service } from '@angular/core';
import { environment } from '../../environments/environment';
import { Campaign } from './campaign.model';

@Service()
export class CampaignService {
  private readonly url = `${environment.apiUrl}/campaigns`;

  /** Llista de campanyes. Retorna un recurs amb value(), isLoading() i error(). */
  list() {
    return httpResource<Campaign[]>(() => this.url, { defaultValue: [] });
  }
}
