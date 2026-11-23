import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { CampaignDetail, Member } from '../campaign.model';
import { CampaignContext } from '../campaign-context.service';
import { CampaignService } from '../campaign.service';
import { CampaignHome } from './campaign-home';

const CAMPAIGN: CampaignDetail = {
  id: 'c1',
  name: 'El final infinit',
  description: 'La campanya del grup',
  imageUrl: null,
  archivedAt: null,
  role: 'player',
};
const MEMBERS: Member[] = [
  { userId: 'u1', name: 'Miquel', avatarUrl: null, role: 'master', joinedAt: '2026-11-01' },
  { userId: 'u2', name: 'Laia', avatarUrl: null, role: 'player', joinedAt: '2026-11-02' },
];

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('CampaignHome', () => {
  let removeMember: ReturnType<typeof vi.fn>;
  let clear: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  async function render(campaign: CampaignDetail = CAMPAIGN) {
    removeMember = vi.fn().mockResolvedValue(undefined);
    clear = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CampaignContext,
          useValue: { campaign: signal(campaign), isArchived: signal(campaign.archivedAt !== null), clear },
        },
        {
          provide: CampaignService,
          useValue: {
            members: () => ({ value: signal(MEMBERS), error: signal(undefined), reload: vi.fn() }),
            removeMember,
          },
        },
        { provide: AuthService, useValue: { profile: signal({ id: 'u2', name: 'Laia' }) } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(CampaignHome);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const leaveButton = (page: HTMLElement) =>
    [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Surt') || b.textContent?.includes('Sortint'));

  it('shows the campaign name, my role and the description', async () => {
    const { page } = await render();

    expect(page.querySelector('h1')?.textContent).toContain('El final infinit');
    expect(page.querySelector('.etiqueta')?.textContent).toBe('Jugador');
    expect(page.textContent).toContain('La campanya del grup');
    expect(page.querySelector('.avis')).toBeNull();
  });

  it('warns that an archived campaign is read-only', async () => {
    const { page } = await render({ ...CAMPAIGN, archivedAt: '2026-11-01T10:00:00.000Z' });

    expect(page.querySelector('.arxivada')).not.toBeNull();
    expect(page.querySelector('[role="note"]')?.textContent).toContain('només es pot consultar');
  });

  it('shows the members of the group', async () => {
    const { page } = await render();

    const names = [...page.querySelectorAll('app-member-list .nom')].map((n) => n.textContent);
    expect(names).toEqual(['Miquel', 'Laia']);
  });

  it('does not offer the master a way to leave', async () => {
    const { page } = await render({ ...CAMPAIGN, role: 'master' });

    expect(leaveButton(page)).toBeUndefined();
  });

  it('lets a player leave after confirming, and goes back to my campaigns', async () => {
    const { page } = await render();

    leaveButton(page)!.click();
    await settle();

    expect(confirmSpy).toHaveBeenCalled();
    expect(removeMember).toHaveBeenCalledWith('c1', 'u2');
    expect(navigate).toHaveBeenCalledWith('/campanyes');
    expect(clear).toHaveBeenCalled();
  });

  it('does nothing when the player cancels', async () => {
    const { page } = await render();
    confirmSpy.mockReturnValue(false);

    leaveButton(page)!.click();
    await settle();

    expect(removeMember).not.toHaveBeenCalled();
  });

  it('sends only one request when the button is clicked twice', async () => {
    const { fixture, page } = await render();
    let finish!: () => void;
    removeMember.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    leaveButton(page)!.click();
    await fixture.whenStable();
    expect(leaveButton(page)!.disabled).toBe(true);
    leaveButton(page)!.click();
    finish();
    await settle();

    expect(removeMember).toHaveBeenCalledTimes(1);
  });

  it('shows the error and lets the player try again when leaving fails', async () => {
    const { fixture, page } = await render();
    removeMember.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));

    leaveButton(page)!.click();
    await settle();
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('No s’ha pogut connectar');
    expect(leaveButton(page)!.disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();

    leaveButton(page)!.click();
    await settle();
    expect(navigate).toHaveBeenCalledWith('/campanyes');
  });
});