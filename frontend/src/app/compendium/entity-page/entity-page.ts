import { Component, computed, inject, input, resource, signal  } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CampaignContext } from '../../campaigns/campaign-context.service';
import { apiErrorMessage } from '../../shared/http/api-error';
import { Button } from '../../shared/ui/button/button';
import { Entity, ENTITY_TYPE_LABELS } from '../entity.model';
import { EntityService } from '../entity.service';

/**
 * Fitxa d'una entitat (/c/:id/compendi/:entityId). Si és secreta i soc jugador, l'API respon 404
 * i es mostra igual que si no existís (D3). El màster la pot editar, revelar o amagar (HU-32),
 * arxivar o recuperar (HU-35) i eliminar. Les aparicions al diari (HU-34) arriben amb F2.
 */

@Component({
  imports: [RouterLink, Button],
  selector: 'app-entity-page',
  styleUrl: './entity-page.scss',
  templateUrl: './entity-page.html',
})
export class EntityPage {
  protected readonly context = inject(CampaignContext);
  private readonly entityService = inject(EntityService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** :entityId de la ruta (withComponentInputBinding). */
  readonly entityId = input.required<string>();

  protected readonly typeLabels = ENTITY_TYPE_LABELS;

  protected readonly entity = resource({
    params: () => {
      const campaignId = this.context.campaign()?.id;
      return campaignId ? { campaignId, id: this.entityId() } : undefined;
    },
    loader: ({ params }) => this.entityService.get(params.campaignId, params.id),
  });

  /** 404: no existeix, o és secreta i no la puc veure. */
  protected readonly notFound = computed(() => {
    const error = this.entity.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  /** El màster pot fer canvis, si la campanya no està arxivada (només lectura). */
  protected readonly canManage = computed(() => this.context.isMaster() && !this.context.isArchived());

  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected reveal(entity: Entity) {
    return this.run((cid) => this.entityService.reveal(cid, entity.id));
  }

  protected hide(entity: Entity) {
    if (!confirm(`«${entity.name}» deixarà de ser visible per als jugadors. Vols amagar-la?`)) return;
    return this.run((cid) => this.entityService.update(cid, entity.id, { isSecret: true }));
  }

  protected archive(entity: Entity) {
    return this.run((cid) => this.entityService.archive(cid, entity.id));
  }

  protected unarchive(entity: Entity) {
    return this.run((cid) => this.entityService.unarchive(cid, entity.id));
  }

  protected async remove(entity: Entity): Promise<void> {
    const campaignId = this.context.campaign()?.id;
    if (!campaignId || this.busy()) return;
    if (!confirm(`Segur que vols eliminar «${entity.name}»? No es pot desfer.`)) return;

    this.busy.set(true);
    this.actionError.set(null);
    try {
      await this.entityService.remove(campaignId, entity.id);
      await this.router.navigate(['..'], { relativeTo: this.route });
    } catch (error) {
      this.actionError.set(apiErrorMessage(error, 'No s’ha pogut eliminar. Torna-ho a provar'));
    } finally {
      this.busy.set(false);
    }
  }

  /** Executa una acció del màster i mostra l'entitat tal com l'ha deixat l'API. */
  private async run(action: (campaignId: string) => Promise<Entity>): Promise<void> {
    const campaignId = this.context.campaign()?.id;
    if (!campaignId || this.busy()) return;

    this.busy.set(true);
    this.actionError.set(null);
    try {
      this.entity.set(await action(campaignId));
    } catch (error) {
      this.actionError.set(apiErrorMessage(error, 'No s’ha pogut desar el canvi. Torna-ho a provar'));
    } finally {
      this.busy.set(false);
    }
  }
}
