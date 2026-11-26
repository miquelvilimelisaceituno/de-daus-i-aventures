import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CampaignContext } from '../../campaigns/campaign-context.service';
import { Entity } from '../entity.model';
import { EntityService } from '../entity.service';
import { EntityFormPage } from './entity-form-page';

const PONENT: Entity = {
  id: 'e1',
  type: 'location',
  name: 'Ponent',
  description: 'Ciutat portuària',
  imageUrl: null,
  isSecret: false,
  archivedAt: null,
};

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('EntityFormPage', () => {
  type Mock = ReturnType<typeof vi.fn>;
  let service: { get: Mock; create: Mock; update: Mock };
  let navigate: ReturnType<typeof vi.spyOn>;

  async function render(entityId?: string, get: Mock = vi.fn().mockResolvedValue(PONENT)) {
    service = {
      get,
      create: vi.fn().mockResolvedValue({ ...PONENT, id: 'e2' }),
      update: vi.fn().mockResolvedValue(PONENT),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CampaignContext, useValue: { campaign: signal({ id: 'c1' }) } },
        { provide: EntityService, useValue: service },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(EntityFormPage);
    if (entityId) fixture.componentRef.setInput('entityId', entityId);
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => vi.restoreAllMocks());

  function fill(page: HTMLElement, values: { type?: string; name?: string; description?: string; imageUrl?: string }) {
    if (values.type !== undefined) {
      const select = page.querySelector('select')!;
      select.value = values.type;
      select.dispatchEvent(new Event('change'));
    }
    const [name, imageUrl] = page.querySelectorAll<HTMLInputElement>('app-field input');
    if (values.name !== undefined) {
      name.value = values.name;
      name.dispatchEvent(new Event('input'));
    }
    if (values.imageUrl !== undefined) {
      imageUrl.value = values.imageUrl;
      imageUrl.dispatchEvent(new Event('input'));
    }
    if (values.description !== undefined) {
      const textarea = page.querySelector('textarea')!;
      textarea.value = values.description;
      textarea.dispatchEvent(new Event('input'));
    }
  }

  async function submit(fixture: { detectChanges(): void }, page: HTMLElement) {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
    fixture.detectChanges();
  }

  it('creating: starts empty, secret by default', async () => {
    const { page } = await render();

    expect(page.querySelector('h1')?.textContent).toBe('Nova entitat');
    expect(page.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true);
    expect(service.get).not.toHaveBeenCalled();
  });

  it('with an empty form, shows the errors and does not call the API', async () => {
    const { fixture, page } = await render();

    await submit(fixture, page);

    expect(page.textContent).toContain('Tria un tipus');
    expect(page.textContent).toContain('El nom és obligatori');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('a name with only spaces counts as empty', async () => {
    const { fixture, page } = await render();
    fill(page, { type: 'npc', name: '   ' });

    await submit(fixture, page);

    expect(page.textContent).toContain('El nom és obligatori');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects an image address that is not http(s)', async () => {
    const { fixture, page } = await render();
    fill(page, { type: 'npc', name: 'Brugal', imageUrl: 'javascript:alert(1)' });

    await submit(fixture, page);

    expect(page.textContent).toContain('http:// o https://');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('creates the entity (trimmed, empty fields as null) and goes to its page', async () => {
    const { fixture, page } = await render();
    fill(page, { type: 'npc', name: '  Brugal el Vell ', description: '   ' });

    await submit(fixture, page);

    expect(service.create).toHaveBeenCalledWith('c1', {
      type: 'npc',
      name: 'Brugal el Vell',
      description: null,
      imageUrl: null,
      isSecret: true,
    });
    expect(navigate).toHaveBeenCalledWith(['..', 'e2'], expect.objectContaining({ relativeTo: expect.anything() }));
  });

  it('editing: loads the entity into the form', async () => {
    const { page } = await render('e1');

    expect(service.get).toHaveBeenCalledWith('c1', 'e1');
    expect(page.querySelector('h1')?.textContent).toBe('Edita l’entitat');
    expect(page.querySelector('select')!.value).toBe('location');
    expect(page.querySelector<HTMLInputElement>('app-field input')!.value).toBe('Ponent');
    expect(page.querySelector('textarea')!.value).toBe('Ciutat portuària');
    expect(page.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false);
  });

  it('editing: saves the changes and goes back to the entity page', async () => {
    const { fixture, page } = await render('e1');
    fill(page, { name: 'Ponent Vell' });

    await submit(fixture, page);

    expect(service.update).toHaveBeenCalledWith('c1', 'e1', expect.objectContaining({ name: 'Ponent Vell' }));
    expect(navigate).toHaveBeenCalledWith(['..'], expect.objectContaining({ relativeTo: expect.anything() }));
  });

  it('editing an entity that does not exist says so instead of showing the form', async () => {
    const { page } = await render('e9', vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 404 })));

    expect(page.querySelector('[role="alert"]')?.textContent).toBe('Aquesta entitat no existeix.');
    expect(page.querySelector('form')).toBeNull();
  });

  it('if the API fails, shows its message and keeps what was typed', async () => {
    const { fixture, page } = await render();
    service.create.mockRejectedValue(new HttpErrorResponse({ status: 0 }));
    fill(page, { type: 'faction', name: 'La Mà Negra' });

    await submit(fixture, page);

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('No s’ha pogut connectar');
    expect(page.querySelector<HTMLInputElement>('app-field input')!.value).toBe('La Mà Negra');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('a double submit creates only one entity', async () => {
    const { page } = await render();
    let finish!: (e: Entity) => void;
    service.create.mockReturnValue(new Promise<Entity>((resolve) => (finish = resolve)));
    fill(page, { type: 'npc', name: 'Brugal' });

    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    finish({ ...PONENT, id: 'e2' });
    await settle();

    expect(service.create).toHaveBeenCalledTimes(1);
  });
});
