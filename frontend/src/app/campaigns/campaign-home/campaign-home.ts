import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { apiErrorMessage } from '../../shared/http/api-error';
import { Button } from '../../shared/ui/button/button';
import { ROLE_LABELS } from '../campaign.model';
import { CampaignContext } from '../campaign-context.service';
import { CampaignService } from '../campaign.service';
import { MemberList } from '../member-list/member-list';

/** Inici de la campanya (/c/:id). Amb F2 hi haurà el diari: última sessió, propera data i el grup. */
@Component({
  imports: [Button, MemberList],
  selector: 'app-campaign-home',
  styleUrl: './campaign-home.scss',
  templateUrl: './campaign-home.html',
})
export class CampaignHome {
  protected readonly context = inject(CampaignContext);
  private readonly campaignService = inject(CampaignService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly roleLabels = ROLE_LABELS;
  protected readonly members = this.campaignService.members(() => this.context.campaign()?.id);

  protected readonly leaving = signal(false);
  protected readonly leaveError = signal<string | null>(null);

  /** Sortir de la campanya (HU-15). Només els jugadors: el màster no pot sortir (MVP §5.2). */
  protected async leave(): Promise<void> {
    const campaign = this.context.campaign();
    const me = this.auth.profile();
    if (!campaign || !me || this.leaving()) return;
    if (!confirm(`Segur que vols sortir de «${campaign.name}»? Hi podràs tornar amb un codi vàlid.`)) return;

    this.leaving.set(true);
    this.leaveError.set(null);
    try {
      await this.campaignService.removeMember(campaign.id, me.id);
      await this.router.navigateByUrl('/campanyes');
      this.context.clear();
    } catch (error) {
      this.leaveError.set(apiErrorMessage(error, 'No s’ha pogut sortir de la campanya. Torna-ho a provar'));
    } finally {
      this.leaving.set(false);
    }
  }
}