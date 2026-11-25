import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Entity, EntityData, EntityFilters } from './entity.model';

/** El compendi d'una campanya: /api/campaigns/:cid/entities (F3). */
@Service()
export class EntityService {
  private readonly http = inject(HttpClient);

  private url(campaignId: string, rest = '') {
    return `${environment.apiUrl}/campaigns/${campaignId}/entities${rest}`;
  }

  /**
   * La llista, que es torna a demanar sola quan canvien la campanya o els filtres.
   * Mentre no hi hagi campanya (undefined) no es fa cap petició.
   */
  list(campaignId: () => string | undefined, filters: () => EntityFilters) {
    return httpResource<Entity[]>(
      () => {
        const id = campaignId();
        if (!id) return undefined;
        const { type, q, archived } = filters();
        let params = new HttpParams();
        if (type) params = params.set('type', type);
        if (q?.trim()) params = params.set('q', q.trim());
        if (archived) params = params.set('archived', 'true');
        return { url: this.url(id), params };
      },
      { defaultValue: [] },
    );
  }

  /** Una entitat. Si és secreta i soc jugador, o no existeix → error 404. */
  get(campaignId: string, id: string): Promise<Entity> {
    return firstValueFrom(this.http.get<Entity>(this.url(campaignId, `/${id}`)));
  }

  /** Crear (màster, HU-30). Secreta si no es diu el contrari. */
  create(campaignId: string, data: EntityData): Promise<Entity> {
    return firstValueFrom(this.http.post<Entity>(this.url(campaignId), data));
  }

  /** Editar (màster). Amagar-la de nou és { isSecret: true }. */
  update(campaignId: string, id: string, changes: Partial<EntityData>): Promise<Entity> {
    return firstValueFrom(this.http.patch<Entity>(this.url(campaignId, `/${id}`), changes));
  }

  remove(campaignId: string, id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.url(campaignId, `/${id}`)));
  }

  /** Revelar-la a tots els jugadors (HU-32). */
  reveal(campaignId: string, id: string): Promise<Entity> {
    return this.action(campaignId, id, 'reveal');
  }

  /** Arxivar-la: surt de les llistes, però no es perd (HU-35). */
  archive(campaignId: string, id: string): Promise<Entity> {
    return this.action(campaignId, id, 'archive');
  }

  unarchive(campaignId: string, id: string): Promise<Entity> {
    return this.action(campaignId, id, 'unarchive');
  }

  private action(campaignId: string, id: string, verb: string): Promise<Entity> {
    return firstValueFrom(this.http.post<Entity>(this.url(campaignId, `/${id}/${verb}`), {}));
  }
}