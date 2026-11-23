import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../shared/http/api-error';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Member } from '../campaign.model';
import { CampaignContext } from '../campaign-context.service';
import { CampaignService } from '../campaign.service';
import { MemberList } from '../member-list/member-list';

/** Mateixes regles que PATCH /api/campaigns/:cid. */
const MAX_PLAYERS_MIN = 1;
const MAX_PLAYERS_MAX = 12;

/**
 * Configuració del màster (/c/:id/config): codi d'invitació (HU-11), invitacions obertes i
 * màxim de jugadors (HU-16) i membres amb expulsar (HU-14). Una campanya arxivada és només de lectura.
 */
@Component({
  imports: [ReactiveFormsModule, Button, Card, MemberList],
  selector: 'app-campaign-config',
  styleUrl: './campaign-config.scss',
  templateUrl: './campaign-config.html',
})
export class CampaignConfig {
  protected readonly context = inject(CampaignContext);
  private readonly campaignService = inject(CampaignService);

  protected readonly members = this.campaignService.members(() => this.context.campaign()?.id);
  protected readonly playerCount = computed(
    () => this.members.value().filter((member) => member.role === 'player').length,
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    inviteOpen: [true],
    maxPlayers: [
      6,
      [
        Validators.required,
        Validators.min(MAX_PLAYERS_MIN),
        Validators.max(MAX_PLAYERS_MAX),
        Validators.pattern(/^\d+$/),
      ],
    ],
  });

  /** El màxim que hi ha escrit ara mateix (signal), per avisar abans de desar. */
  private readonly maxPlayersValue = toSignal(this.form.controls.maxPlayers.valueChanges, {
    initialValue: this.form.controls.maxPlayers.value,
  });
  /** Hi ha més jugadors que el màxim: ningú no és expulsat, però no hi pot entrar ningú més. */
  protected readonly overLimit = computed(() => this.playerCount() > this.maxPlayersValue());

  // Codi d'invitació
  protected readonly regenerating = signal(false);
  protected readonly copied = signal(false);
  protected readonly codeError = signal<string | null>(null);
  // Invitacions
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly saveError = signal<string | null>(null);
  // Membres
  protected readonly expelling = signal(false);
  protected readonly membersError = signal<string | null>(null);

  constructor() {
    // El masterGuard ja ha carregat la campanya: omplim el formulari amb la configuració actual.
    const campaign = this.context.campaign();
    if (campaign) {
      this.form.setValue({
        inviteOpen: campaign.inviteOpen ?? true,
        maxPlayers: campaign.maxPlayers ?? 6,
      });
    }
    if (this.context.isArchived()) this.form.disable();
  }

  protected maxPlayersError(): string | null {
    const control = this.form.controls.maxPlayers;
    if (control.valid) return null;
    return `Ha de ser un nombre enter entre ${MAX_PLAYERS_MIN} i ${MAX_PLAYERS_MAX}`;
  }

  protected async copyCode(code: string): Promise<void> {
    this.codeError.set(null);
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
    } catch {
      this.codeError.set('No s’ha pogut copiar. Selecciona el codi i copia’l a mà');
    }
  }

  protected async regenerateCode(): Promise<void> {
    const campaign = this.context.campaign();
    if (!campaign || this.regenerating()) return;
    if (!confirm('El codi actual deixarà de funcionar a l’instant. Vols generar-ne un de nou?')) return;

    this.regenerating.set(true);
    this.codeError.set(null);
    this.copied.set(false);
    try {
      const inviteCode = await this.campaignService.regenerateInviteCode(campaign.id);
      this.context.patch({ inviteCode });
    } catch (error) {
      this.codeError.set(apiErrorMessage(error, 'No s’ha pogut generar el codi. Torna-ho a provar'));
    } finally {
      this.regenerating.set(false);
    }
  }

  protected async save(): Promise<void> {
    const campaign = this.context.campaign();
    this.saved.set(false);
    this.saveError.set(null);
    if (!campaign || this.form.invalid || this.saving()) return;

    this.saving.set(true);
    try {
      const updated = await this.campaignService.update(campaign.id, this.form.getRawValue());
      this.context.patch(updated);
      this.form.markAsPristine();
      this.saved.set(true);
    } catch (error) {
      this.saveError.set(apiErrorMessage(error, 'No s’han pogut desar els canvis. Torna-ho a provar'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async expel(member: Member): Promise<void> {
    const campaign = this.context.campaign();
    if (!campaign || this.expelling()) return;
    if (!confirm(`Segur que vols expulsar ${member.name}? Perdrà l’accés a la campanya a l’instant.`)) return;

    this.expelling.set(true);
    this.membersError.set(null);
    try {
      await this.campaignService.removeMember(campaign.id, member.userId);
      this.members.reload();
    } catch (error) {
      // 404: ja no és membre (ha sortit o l'ha expulsat una altra pestanya). La llista estava desfasada.
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.membersError.set(`${member.name} ja no forma part de la campanya.`);
        this.members.reload();
      } else {
        this.membersError.set(apiErrorMessage(error, 'No s’ha pogut expulsar. Torna-ho a provar'));
      }
    } finally {
      this.expelling.set(false);
    }
  }
}