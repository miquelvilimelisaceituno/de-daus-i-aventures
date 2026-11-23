import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampaignDetail, Member } from '../campaign.model';
import { CampaignContext } from '../campaign-context.service';
import { CampaignService } from '../campaign.service';
import { CampaignConfig } from './campaign-config';

const CAMPAIGN: CampaignDetail = {
  id: 'c1',
  name: 'El final infinit',
  description: null,
  imageUrl: null,
  archivedAt: null,
  role: 'master',
  inviteCode: 'DRAC2024',
  inviteOpen: false,
  maxPlayers: 4,
};
const MEMBERS: Member[] = [
  { userId: 'u1', name: 'Miquel', avatarUrl: null, role: 'master', joinedAt: '2026-11-01' },
  { userId: 'u2', name: 'Laia', avatarUrl: null, role: 'player', joinedAt: '2026-11-02' },
  { userId: 'u3', name: 'Pau', avatarUrl: null, role: 'player', joinedAt: '2026-11-03' },
];

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('CampaignConfig', () => {
  let fixture: ComponentFixture<CampaignConfig>;
  let page: HTMLElement;
  let campaign: ReturnType<typeof signal<CampaignDetail | null>>;
  let service: {
    members: () => unknown;
    regenerateInviteCode: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    removeMember: ReturnType<typeof vi.fn>;
  };
  let reload: ReturnType<typeof vi.fn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  async function render(initial: CampaignDetail = CAMPAIGN) {
    campaign = signal<CampaignDetail | null>(initial);
    reload = vi.fn();
    service = {
      members: () => ({ value: signal(MEMBERS), error: signal(undefined), reload }),
      regenerateInviteCode: vi.fn().mockResolvedValue('NOU12345'),
      update: vi.fn(async (_id: string, changes: Partial<CampaignDetail>) => ({ ...campaign()!, ...changes })),
      removeMember: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CampaignContext,
          useValue: {
            campaign,
            isArchived: computed(() => campaign()?.archivedAt != null),
            patch: (changes: Partial<CampaignDetail>) => campaign.update((c) => ({ ...c!, ...changes })),
          },
        },
        { provide: CampaignService, useValue: service },
      ],
    });
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture = TestBed.createComponent(CampaignConfig);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function stable() {
    await settle();
    await fixture.whenStable();
  }

  function button(text: string): HTMLButtonElement | undefined {
    return [...page.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
  }

  const maxInput = () => page.querySelector<HTMLInputElement>('input[type="number"]')!;
  const openCheckbox = () => page.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  const alerts = () => [...page.querySelectorAll('[role="alert"]')].map((a) => a.textContent?.trim());
  const statuses = () => [...page.querySelectorAll('[role="status"]')].map((a) => a.textContent?.trim());

  async function setMax(value: string) {
    maxInput().value = value;
    maxInput().dispatchEvent(new Event('input'));
    await stable();
  }

  describe('invite code', () => {
    it('shows the current code', async () => {
      await render();

      expect(page.querySelector('.codi')?.textContent).toBe('DRAC2024');
    });

    it('copies the code to the clipboard', async () => {
      await render();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

      button('Copia el codi')!.click();
      await stable();

      expect(writeText).toHaveBeenCalledWith('DRAC2024');
      expect(statuses()).toContain('Codi copiat');
    });

    it('explains how to copy by hand when the clipboard is not available', async () => {
      await render();
      const writeText = vi.fn().mockRejectedValue(new Error('denied'));
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

      button('Copia el codi')!.click();
      await stable();

      expect(alerts()[0]).toContain('copia’l a mà');
    });

    it('regenerates the code after confirming and shows the new one', async () => {
      await render();

      button('Genera’n un de nou')!.click();
      await stable();

      expect(confirmSpy).toHaveBeenCalled();
      expect(service.regenerateInviteCode).toHaveBeenCalledWith('c1');
      expect(page.querySelector('.codi')?.textContent).toBe('NOU12345');
    });

    it('asks the API only once when regenerate is clicked twice', async () => {
      await render();
      let finish!: (code: string) => void;
      service.regenerateInviteCode.mockReturnValue(new Promise<string>((resolve) => (finish = resolve)));

      button('Genera’n un de nou')!.click();
      await stable();
      expect(button('Generant…')!.disabled).toBe(true);
      button('Generant…')!.click();
      finish('NOU12345');
      await stable();

      expect(service.regenerateInviteCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('invitations', () => {
    it('fills the form with the current settings', async () => {
      await render();

      expect(openCheckbox().checked).toBe(false);
      expect(maxInput().value).toBe('4');
      expect(page.textContent).toContain('Ara hi ha 2 jugadors');
    });

    it('saves the settings and updates the campaign', async () => {
      await render();
      openCheckbox().click();
      await setMax('3');

      page.querySelector('form')!.dispatchEvent(new Event('submit'));
      await stable();

      expect(service.update).toHaveBeenCalledWith('c1', { inviteOpen: true, maxPlayers: 3 });
      expect(campaign()?.maxPlayers).toBe(3);
      expect(statuses()).toContain('Canvis desats');
    });

    it('does not save a maximum outside 1–12', async () => {
      await render();
      await setMax('13');

      page.querySelector('form')!.dispatchEvent(new Event('submit'));
      await stable();

      expect(service.update).not.toHaveBeenCalled();
      expect(page.textContent).toContain('entre 1 i 12');
    });

    it('warns when the maximum is below the current players', async () => {
      await render();
      await setMax('1');

      expect(statuses().some((s) => s?.includes('no s’expulsa ningú'))).toBe(true);
    });

    it('shows the API message when saving fails, and keeps the changes', async () => {
      await render();
      service.update.mockRejectedValueOnce(
        new HttpErrorResponse({ status: 409, error: { error: 'La campanya està arxivada' } }),
      );
      await setMax('5');

      page.querySelector('form')!.dispatchEvent(new Event('submit'));
      await stable();

      expect(alerts()).toContain('La campanya està arxivada');
      expect(maxInput().value).toBe('5');
    });
  });

  describe('members', () => {
    it('expels a player after confirming and reloads the list', async () => {
      await render();

      page.querySelector<HTMLButtonElement>('button[aria-label="Expulsa Laia"]')!.click();
      await stable();

      expect(service.removeMember).toHaveBeenCalledWith('c1', 'u2');
      expect(reload).toHaveBeenCalled();
    });

    it('does nothing when the master cancels', async () => {
      await render();
      confirmSpy.mockReturnValue(false);

      page.querySelector<HTMLButtonElement>('button[aria-label="Expulsa Laia"]')!.click();
      await stable();

      expect(service.removeMember).not.toHaveBeenCalled();
    });

    it('explains and refreshes the list when the player had already left (404)', async () => {
      await render();
      service.removeMember.mockRejectedValueOnce(
        new HttpErrorResponse({ status: 404, error: { error: 'Membre no trobat' } }),
      );

      page.querySelector<HTMLButtonElement>('button[aria-label="Expulsa Laia"]')!.click();
      await stable();

      expect(alerts()).toContain('Laia ja no forma part de la campanya.');
      expect(reload).toHaveBeenCalled();
    });
  });

  describe('archived campaign', () => {
    it('is read-only: no actions and a disabled form', async () => {
      await render({ ...CAMPAIGN, archivedAt: '2026-11-01T10:00:00.000Z' });

      expect(page.querySelector('[role="note"]')?.textContent).toContain('arxivada');
      expect(button('Genera’n un de nou')).toBeUndefined();
      expect(button('Desa els canvis')).toBeUndefined();
      expect(page.querySelector('button[aria-label^="Expulsa"]')).toBeNull();
      expect(maxInput().disabled).toBe(true);
    });
  });
});