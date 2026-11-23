import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CampaignDetail } from '../campaign.model';
import { CampaignContext } from '../campaign-context.service';
import { CampaignHome } from './campaign-home';

const CAMPAIGN: CampaignDetail = {
  id: 'c1',
  name: 'El final infinit',
  description: 'La campanya del grup',
  imageUrl: null,
  archivedAt: null,
  role: 'player',
};

describe('CampaignHome', () => {
  async function render(campaign: CampaignDetail) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CampaignContext,
          useValue: { campaign: signal(campaign), isArchived: signal(campaign.archivedAt !== null) },
        },
      ],
    });
    const fixture = TestBed.createComponent(CampaignHome);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the campaign name, my role and the description', async () => {
    const page = await render(CAMPAIGN);

    expect(page.querySelector('h1')?.textContent).toContain('El final infinit');
    expect(page.querySelector('.etiqueta')?.textContent).toBe('Jugador');
    expect(page.textContent).toContain('La campanya del grup');
    expect(page.querySelector('.avis')).toBeNull();
  });

  it('warns that an archived campaign is read-only', async () => {
    const page = await render({ ...CAMPAIGN, archivedAt: '2026-11-01T10:00:00.000Z' });

    expect(page.querySelector('.arxivada')).not.toBeNull();
    expect(page.querySelector('[role="note"]')?.textContent).toContain('només es pot consultar');
  });
});