import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CampaignContext } from '../../campaigns/campaign-context.service';
import { Entity } from '../entity.model';
import { EntityService } from '../entity.service';
import { EntityPage } from './entity-page';

const MA_NEGRA: Entity = {
  id: 'e2',
  type: 'faction',
  name: 'La Mà Negra',
  description: 'Contrabandistes del port.\nNo s’hi pot confiar.',
  imageUrl: null,
  isSecret: true,
  archivedAt: null,
};

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));
const httpError = (status: number) => new HttpErrorResponse({ status, error: { error: 'No trobat' } });

describe('EntityPage', () => {
  type Mock = ReturnType<typeof vi.fn>;
  let service: { get: Mock; reveal: Mock; update: Mock; archive: Mock; unarchive: Mock; remove: Mock };
  let navigate: ReturnType<typeof vi.spyOn>;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  async function render({
    entity = MA_NEGRA as Entity | HttpErrorResponse,
    master = true,
    archivedCampaign = false,
  } = {}) {
    service = {
      // HttpErrorResponse no és un Error: cal comprovar-ho amb la seva pròpia classe.
      get: entity instanceof HttpErrorResponse ? vi.fn().mockRejectedValue(entity) : vi.fn().mockResolvedValue(entity),
      reveal: vi.fn().mockResolvedValue({ ...MA_NEGRA, isSecret: false }),
      update: vi.fn().mockResolvedValue({ ...MA_NEGRA, isSecret: true }),
      archive: vi.fn().mockResolvedValue({ ...MA_NEGRA, archivedAt: '2026-11-25T10:00:00Z' }),
      unarchive: vi.fn().mockResolvedValue({ ...MA_NEGRA, archivedAt: null }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CampaignContext,
          useValue: { campaign: signal({ id: 'c1' }), isMaster: signal(master), isArchived: signal(archivedCampaign) },
        },
        { provide: EntityService, useValue: service },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(EntityPage);
    fixture.componentRef.setInput('entityId', 'e2');
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => vi.restoreAllMocks());

  const button = (page: HTMLElement, text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text));

  async function click(fixture: { detectChanges(): void }, page: HTMLElement, text: string) {
    button(page, text)!.click();
    await settle();
    fixture.detectChanges();
  }

  it('loads the entity of the URL and shows its name, type, badges and description', async () => {
    const { page } = await render();

    expect(service.get).toHaveBeenCalledWith('c1', 'e2');
    expect(page.querySelector('h1')?.textContent).toBe('La Mà Negra');
    expect(page.querySelector('.etiqueta')?.textContent).toBe('Facció');
    expect(page.querySelector('.secreta')).not.toBeNull();
    expect(page.querySelector('.descripcio')?.textContent).toContain('No s’hi pot confiar');
  });

  it('a 404 shows «not found», the same for a secret entity as for a missing one (D3)', async () => {
    const { page } = await render({ entity: httpError(404) });

    expect(page.querySelector('h1')?.textContent).toBe('No trobada');
    expect(page.textContent).toContain('no existeix o encara no l’has descoberta');
  });

  it('another error offers to retry', async () => {
    const { fixture, page } = await render({ entity: httpError(0) });
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('No s’ha pogut carregar');

    service.get.mockResolvedValue(MA_NEGRA);
    await click(fixture, page, 'Torna-ho a provar');

    expect(service.get).toHaveBeenCalledTimes(2);
    expect(page.querySelector('h1')?.textContent).toBe('La Mà Negra');
  });

  it('a player sees no actions', async () => {
    const { page } = await render({ master: false, entity: { ...MA_NEGRA, isSecret: undefined } });

    expect(page.querySelector('.accions')).toBeNull();
    expect(page.querySelector('.secreta')).toBeNull();
  });

  it('in an archived campaign the master sees no actions either', async () => {
    const { page } = await render({ archivedCampaign: true });

    expect(page.querySelector('.accions')).toBeNull();
  });

  it('the master reveals a secret entity and the page shows it revealed (HU-32)', async () => {
    const { fixture, page } = await render();

    await click(fixture, page, 'Revela-la');

    expect(service.reveal).toHaveBeenCalledWith('c1', 'e2');
    expect(page.querySelector('.secreta')).toBeNull();
    expect(button(page, 'Amaga-la')).toBeDefined();
  });

  it('hiding asks for confirmation and sends isSecret: true', async () => {
    const { fixture, page } = await render({ entity: { ...MA_NEGRA, isSecret: false } });

    await click(fixture, page, 'Amaga-la');

    expect(confirmSpy).toHaveBeenCalled();
    expect(service.update).toHaveBeenCalledWith('c1', 'e2', { isSecret: true });
    expect(page.querySelector('.secreta')).not.toBeNull();
  });

  it('archives and unarchives (HU-35)', async () => {
    const { fixture, page } = await render();

    await click(fixture, page, 'Arxiva-la');
    expect(service.archive).toHaveBeenCalledWith('c1', 'e2');
    expect(page.querySelector('.arxivada')).not.toBeNull();

    await click(fixture, page, 'Recupera-la');
    expect(service.unarchive).toHaveBeenCalledWith('c1', 'e2');
    expect(page.querySelector('.arxivada')).toBeNull();
  });

  it('deleting asks for confirmation and goes back to the compendium', async () => {
    const { fixture, page } = await render();

    await click(fixture, page, 'Elimina-la');

    expect(service.remove).toHaveBeenCalledWith('c1', 'e2');
    expect(navigate).toHaveBeenCalledWith(['..'], expect.objectContaining({ relativeTo: expect.anything() }));
  });

  it('cancelling the confirmation deletes nothing', async () => {
    const { fixture, page } = await render();
    confirmSpy.mockReturnValue(false);

    await click(fixture, page, 'Elimina-la');

    expect(service.remove).not.toHaveBeenCalled();
  });

  it('shows the API message when an action fails and keeps the entity as it was', async () => {
    const { fixture, page } = await render();
    service.reveal.mockRejectedValue(
      new HttpErrorResponse({ status: 409, error: { error: 'La campanya està arxivada i és només de lectura' } }),
    );

    await click(fixture, page, 'Revela-la');

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('només de lectura');
    expect(page.querySelector('.secreta')).not.toBeNull();
  });

  it('a second click while an action is running does nothing', async () => {
    const { page } = await render();
    let finish!: (e: Entity) => void;
    service.archive.mockReturnValue(new Promise<Entity>((resolve) => (finish = resolve)));

    button(page, 'Arxiva-la')!.click();
    button(page, 'Arxiva-la')!.click();
    finish(MA_NEGRA);
    await settle();

    expect(service.archive).toHaveBeenCalledTimes(1);
  });
});
