import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CampaignContext } from '../../campaigns/campaign-context.service';
import { Entity, EntityFilters } from '../entity.model';
import { EntityService } from '../entity.service';
import { CompendiumPage, SEARCH_DELAY_MS } from './compendium-page';

const ALEX: Entity = { id: 'e1', type: 'npc', name: 'Àlex de Ponent', description: null, imageUrl: null, archivedAt: null };
const MA_NEGRA: Entity = { ...ALEX, id: 'e2', type: 'faction', name: 'La Mà Negra', isSecret: true };
const VELL_PORT: Entity = { ...ALEX, id: 'e3', type: 'location', name: 'Vell Port', archivedAt: '2026-11-20T10:00:00Z' };

const wait = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('CompendiumPage', () => {
  /** Els filtres que la pàgina passa al servei: es llegeixen com ho faria httpResource. */
  let filters: () => EntityFilters;
  let campaignId: () => string | undefined;
  let entities: ReturnType<typeof signal<Entity[]>>;
  let isLoading: ReturnType<typeof signal<boolean>>;
  let error: ReturnType<typeof signal<unknown>>;
  let reload: ReturnType<typeof vi.fn>;

  async function render({ master = false, archivedCampaign = false, list = [ALEX] as Entity[] } = {}) {
    entities = signal(list);
    isLoading = signal(false);
    error = signal<unknown>(undefined);
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CampaignContext,
          useValue: {
            campaign: signal({ id: 'c1' }),
            isMaster: signal(master),
            isArchived: signal(archivedCampaign),
          },
        },
        {
          provide: EntityService,
          useValue: {
            list: (id: () => string | undefined, f: () => EntityFilters) => {
              campaignId = id;
              filters = f;
              return { value: entities, isLoading, error, reload };
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(CompendiumPage);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  const names = (page: HTMLElement) => [...page.querySelectorAll('.nom a')].map((a) => a.textContent?.trim());
  const chip = (page: HTMLElement, label: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('.xip')].find((b) => b.textContent?.trim() === label)!;

  it('lists the entities of the current campaign, each linking to its page', async () => {
    const { page } = await render({ list: [ALEX] });

    expect(campaignId()).toBe('c1');
    expect(names(page)).toEqual(['Àlex de Ponent']);
    expect(page.querySelector('.nom a')?.getAttribute('href')).toBe('/e1');
    expect(page.querySelector('.etiqueta')?.textContent).toBe('PNJ');
  });

  it('starts without filters', async () => {
    await render();

    expect(filters()).toEqual({ type: undefined, q: '', archived: false });
  });

  it('searches what is typed, but only after a pause', async () => {
    const { fixture, page } = await render();
    const input = page.querySelector<HTMLInputElement>('input[type="search"]')!;

    input.value = 'ale';
    input.dispatchEvent(new Event('input'));
    input.value = 'alex';
    input.dispatchEvent(new Event('input'));
    expect(filters().q).toBe('');

    await wait(SEARCH_DELAY_MS + 20);
    fixture.detectChanges();

    expect(filters().q).toBe('alex');
  });

  it('filters by type with the chips, and «Totes» removes the filter', async () => {
    const { fixture, page } = await render();

    chip(page, 'Faccions').click();
    fixture.detectChanges();
    expect(filters().type).toBe('faction');
    expect(chip(page, 'Faccions').getAttribute('aria-pressed')).toBe('true');
    expect(chip(page, 'Totes').getAttribute('aria-pressed')).toBe('false');

    chip(page, 'Totes').click();
    fixture.detectChanges();
    expect(filters().type).toBeUndefined();
  });

  it('a player sees neither «Nova entitat» nor the archived filter', async () => {
    const { page } = await render();

    expect(page.textContent).not.toContain('Nova entitat');
    expect(page.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('the master sees «Nova entitat», the secret and archived badges, and can list the archived ones', async () => {
    const { fixture, page } = await render({ master: true, list: [MA_NEGRA, VELL_PORT] });

    expect(page.querySelector('a.boto-nova')?.getAttribute('href')).toBe('/nova');
    expect(page.querySelector('.secreta')?.textContent).toBe('Secreta');
    expect(page.querySelector('.arxivada')?.textContent).toBe('Arxivada');

    const checkbox = page.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(filters().archived).toBe(true);
  });

  it('in an archived campaign the master cannot create entities', async () => {
    const { page } = await render({ master: true, archivedCampaign: true });

    expect(page.textContent).not.toContain('Nova entitat');
  });

  it('with filters and no entities, says «Cap resultat»', async () => {
    const { fixture, page } = await render({ list: [] });

    chip(page, 'PNJ').click();
    fixture.detectChanges();

    expect(page.querySelector('.buit')?.textContent?.trim()).toBe('Cap resultat.');
  });

  it('without filters and no entities, explains that the compendium is empty', async () => {
    const { page } = await render({ list: [] });

    expect(page.querySelector('.buit')?.textContent).toContain('el màster encara no ha revelat cap entitat');
  });

  it('if the list fails, says so and lets the user retry', async () => {
    const { fixture, page } = await render();
    error.set(new Error('500'));
    fixture.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('No s’ha pogut carregar el compendi');
    [...page.querySelectorAll('button')].find((b) => b.textContent?.includes('Torna-ho a provar'))!.click();
    expect(reload).toHaveBeenCalled();
  });

  it('shows «Carregant…» while loading', async () => {
    const { fixture, page } = await render();
    isLoading.set(true);
    fixture.detectChanges();

    expect(page.textContent).toContain('Carregant…');
  });
});
