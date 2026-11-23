import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldError } from '../../shared/forms/field-error';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../shared/http/api-error';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Field } from '../../shared/ui/field/field';
import { Campaign, ROLE_LABELS } from '../campaign.model';
import { CampaignService } from '../campaign.service';

/** Mateixes regles que POST /api/campaigns i POST /api/campaigns/join. */
const NAME_MIN = 3;
const NAME_MAX = 60;
const CODE_MAX = 20;

type Panel = 'none' | 'create' | 'join';

@Component({
  imports: [ReactiveFormsModule, RouterLink, Button, Card, Field],
  selector: 'app-campaigns-page',
  styleUrl: './campaigns-page.scss',
  templateUrl: './campaigns-page.html',
})
export class CampaignsPage {
  private readonly campaignService = inject(CampaignService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly campaigns = this.campaignService.list();

  /** Quin formulari està obert: cap, crear o unir-se. */
  protected readonly panel = signal<Panel>('none');
  protected readonly pending = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(NAME_MIN), Validators.maxLength(NAME_MAX)]],
  });

  protected readonly joinForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(CODE_MAX)]],
  });

  protected nameError(): string | null {
    return fieldError(this.createForm.controls.name, this.submitted(), {
      required: 'El nom és obligatori',
      minlength: `El nom ha de tenir com a mínim ${NAME_MIN} caràcters`,
      maxlength: `El nom pot tenir com a màxim ${NAME_MAX} caràcters`,
    });
  }

  protected codeError(): string | null {
    return fieldError(this.joinForm.controls.code, this.submitted(), {
      required: 'Escriu el codi',
      maxlength: `El codi pot tenir com a màxim ${CODE_MAX} caràcters`,
    });
  }

  protected open(panel: Panel): void {
    // Mentre s'envia, no es canvia de formulari: la resposta s'ha de mostrar on s'ha demanat.
    if (this.pending()) return;
    this.panel.set(this.panel() === panel ? 'none' : panel);
    this.submitted.set(false);
    this.formError.set(null);
  }

  protected submitCreate(): Promise<void> {
    const { name } = this.createForm.controls;
    // Un nom només d'espais compta com a buit; «  ab » té 2 caràcters, no 4.
    name.setValue(name.value.trim());
    return this.send(
      this.createForm.invalid,
      () => this.campaignService.create({ name: name.value }),
      'No s’ha pogut crear la campanya. Torna-ho a provar',
    );
  }

  protected submitJoin(): Promise<void> {
    const { code } = this.joinForm.controls;
    code.setValue(code.value.trim());
    return this.send(
      this.joinForm.invalid,
      () => this.campaignService.join(code.value),
      'No s’ha pogut unir a la campanya. Torna-ho a provar',
    );
  }

  /**
   * Envia un formulari: no fa res si és invàlid o si ja n'hi ha un en curs (doble clic),
   * mostra l'error de l'API si falla i, si va bé, porta l'usuari a la campanya i recarrega la llista.
   */
  private async send(invalid: boolean, action: () => Promise<Campaign>, fallback: string): Promise<void> {
    this.submitted.set(true);
    this.formError.set(null);
    if (invalid || this.pending()) return;

    this.pending.set(true);
    try {
      const campaign = await action();
      await this.router.navigate(['/c', campaign.id]);
    } catch (error) {
      this.formError.set(apiErrorMessage(error, fallback));
    } finally {
      this.pending.set(false);
    }
  }
}