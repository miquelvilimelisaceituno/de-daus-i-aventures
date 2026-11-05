import { Component, inject } from '@angular/core';
import { CampaignService } from '../campaign.service';

@Component({
  imports: [],
  selector: 'app-campaigns-page',
  styleUrl: './campaigns-page.scss',
  templateUrl: './campaigns-page.html',
})
export class CampaignsPage {
  private readonly campaignService = inject(CampaignService)
  protected readonly campaigns = this.campaignService.list()
}
