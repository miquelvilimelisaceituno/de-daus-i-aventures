import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CampaignContext } from '../../campaigns/campaign-context.service';
import { fieldError } from '../../shared/forms/field-error';
import { apiErrorMessage } from '../../shared/http/api-error';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Field } from '../../shared/ui/field/field';
import { EntityData, ENTITY_TYPE_LABELS, ENTITY_TYPES, EntityType } from '../entity.model';
import { EntityService } from '../entity.service';

/** Mateixes regles que POST i PATCH /api/campaigns/:cid/entities. */
const NAME_MAX = 80;
const DESCRIPTION_MAX = 5000;
const URL_MAX = 500;

/**
 * Un sol formulari per crear (/compendi/nova) i editar (/compendi/:entityId/editar) una
 * entitat (HU-30, CRUD §3.4). Només el màster hi arriba (masterGuard); l'API ho torna a comprovar.
 */

@Component({
  imports: [ReactiveFormsModule, RouterLink, Button, Card, Field],
  selector: 'app-entity-form-page',
  styleUrl: './entity-form-page.scss',
  templateUrl: './entity-form-page.html',
})
export class EntityFormPage implements OnInit {
  private readonly context = inject(CampaignContext);
  private readonly entityService = inject(EntityService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** :entityId de la ruta. Sense → crear; amb → editar. */
  readonly entityId = input<string>();
  protected readonly editing = computed(() => !!this.entityId());

  protected readonly types = ENTITY_TYPES;
  protected readonly typeLabels = ENTITY_TYPE_LABELS;
  protected readonly descriptionMax = DESCRIPTION_MAX;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: ['' as EntityType | '', Validators.required],
    // pattern(/\S/): un nom només amb espais és com no posar-ne cap.
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(NAME_MAX)]],
    description: ['', Validators.maxLength(DESCRIPTION_MAX)],
    imageUrl: ['', [Validators.pattern(/^https?:\/\/\S+$/), Validators.maxLength(URL_MAX)]],
    isSecret: [true],
  });

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly pending = signal(false);
  protected readonly formError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.entityId();
    const campaignId = this.context.campaign()?.id;
    if (!id || !campaignId) return;

    // Editar: omplim el formulari amb l'entitat tal com és ara.
    this.loading.set(true);
    try {
      const entity = await this.entityService.get(campaignId, id);
      this.form.setValue({
        type: entity.type,
        name: entity.name,
        description: entity.description ?? '',
        imageUrl: entity.imageUrl ?? '',
        isSecret: entity.isSecret ?? false,
      });
    } catch (error) {
      this.loadError.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? 'Aquesta entitat no existeix.'
          : apiErrorMessage(error, 'No s’ha pogut carregar l’entitat. Torna-ho a provar'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected typeError() {
    return fieldError(this.form.controls.type, this.submitted(), { required: 'Tria un tipus' });
  }

  protected nameError() {
    return fieldError(this.form.controls.name, this.submitted(), {
      required: 'El nom és obligatori',
      pattern: 'El nom és obligatori',
      maxlength: `El nom pot tenir com a màxim ${NAME_MAX} caràcters`,
    });
  }

  protected descriptionError() {
    return fieldError(this.form.controls.description, this.submitted(), {
      maxlength: `La descripció pot tenir com a màxim ${DESCRIPTION_MAX} caràcters`,
    });
  }

  protected imageUrlError() {
    return fieldError(this.form.controls.imageUrl, this.submitted(), {
      pattern: 'Ha de ser una adreça que comenci per http:// o https://',
      maxlength: `L’adreça pot tenir com a màxim ${URL_MAX} caràcters`,
    });
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.formError.set(null);
    const campaignId = this.context.campaign()?.id;
    if (!campaignId || this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    const data: EntityData = {
      type: value.type as EntityType,
      name: value.name.trim(),
      // Un camp buit vol dir «sense»: s'envia null perquè l'API l'esborri.
      description: value.description.trim() || null,
      imageUrl: value.imageUrl.trim() || null,
      isSecret: value.isSecret,
    };

    this.pending.set(true);
    try {
      const id = this.entityId();
      if (id) {
        await this.entityService.update(campaignId, id, data);
        await this.router.navigate(['..'], { relativeTo: this.route });
      } else {
        const created = await this.entityService.create(campaignId, data);
        await this.router.navigate(['..', created.id], { relativeTo: this.route });
      }
    } catch (error) {
      this.formError.set(apiErrorMessage(error, 'No s’ha pogut desar l’entitat. Torna-ho a provar'));
    } finally {
      this.pending.set(false);
    }
  }
}
