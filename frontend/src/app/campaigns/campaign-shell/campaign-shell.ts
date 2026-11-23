import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideBookOpen, LucideCalendarDays, LucideLibrary, LucideMap, LucideSettings } from '@lucide/angular';
import { CampaignContext } from '../campaign-context.service';

/**
 * Marc de /c/:id: la navegació de la campanya i, a dins, la pàgina de cada secció.
 * Mòbil: barra inferior fixa (D43). A partir de 1200 px: menú lateral (Sitemap §1).
 */
@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideBookOpen,
    LucideLibrary,
    LucideCalendarDays,
    LucideMap,
    LucideSettings,
  ],
  selector: 'app-campaign-shell',
  styleUrl: './campaign-shell.scss',
  templateUrl: './campaign-shell.html',
})
export class CampaignShell {
  protected readonly context = inject(CampaignContext);
}