import { Component, inject } from '@angular/core';
import { ROLE_LABELS } from '../campaign.model';
import { CampaignContext } from '../campaign-context.service';

/** Inici de la campanya (/c/:id). Amb F2 hi haurà el diari: última sessió, propera data i el grup. */
@Component({
  imports: [],
  selector: 'app-campaign-home',
  styleUrl: './campaign-home.scss',
  templateUrl: './campaign-home.html',
})
export class CampaignHome {
  protected readonly context = inject(CampaignContext);
  protected readonly roleLabels = ROLE_LABELS;
}