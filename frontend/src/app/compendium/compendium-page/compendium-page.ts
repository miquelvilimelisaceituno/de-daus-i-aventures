import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampaignContext } from '../../campaigns/campaign-context.service';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { ENTITY_TYPE_LABELS, ENTITY_TYPE_PLURALS, ENTITY_TYPES, EntityType } from '../entity.model';
import { EntityService } from '../entity.service';

/** Temps sense escriure abans de cercar: no es fa una petició per cada tecla. */
export const SEARCH_DELAY_MS = 300;

/**
 * Compendi de la campanya (/c/:id/compendi): llista amb cerca i filtre per tipus (HU-33).
 * El jugador només rep les entitats revelades (ho filtra l'API). El màster veu les secretes
 * marcades, pot llistar les arxivades a part i crear-ne de noves.
 */

@Component({
  imports: [RouterLink, Button, Card],
  selector: 'app-compendium-page',
  styleUrl: './compendium-page.scss',
  templateUrl: './compendium-page.html',
})
export class CompendiumPage implements OnDestroy{
  protected readonly context = inject(CampaignContext);
  private readonly entityService = inject(EntityService);

  protected readonly types = ENTITY_TYPES;
  protected readonly typeLabels = ENTITY_TYPE_LABELS;
  protected readonly typePlurals = ENTITY_TYPE_PLURALS;

  /** El que hi ha escrit a la cerca (es mostra a l'input a l'instant). */
  protected readonly searchText = signal('');
  /** El text que es cerca de veritat, SEARCH_DELAY_MS després de l'última tecla. */
  private readonly query = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly type = signal<EntityType | undefined>(undefined);
  protected readonly archived = signal(false);

  protected readonly entities = this.entityService.list(
    () => this.context.campaign()?.id,
    () => ({ type: this.type(), q: this.query(), archived: this.archived() }),
  );

  /** Hi ha algun filtre actiu: una llista buida vol dir «Cap resultat», no «compendi buit». */
  protected readonly filtering = computed(() => !!this.query().trim() || !!this.type() || this.archived());

  protected onSearch(text: string): void {
    this.searchText.set(text);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.query.set(text), SEARCH_DELAY_MS);
  }

  protected setType(type: EntityType | undefined): void {
    this.type.set(type);
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }
}
