import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Entity, EntityFilters } from './entity.model';
import { EntityService } from './entity.service';

const URL = `${environment.apiUrl}/campaigns/c1/entities`;
const PONENT: Entity = {
  id: 'e1',
  type: 'location',
  name: 'Ponent',
  description: null,
  imageUrl: null,
  isSecret: false,
  archivedAt: null,
};

describe('EntityService', () => {
  let service: EntityService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EntityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list', () => {
    const flushEffects = () => TestBed.tick();

    function listWith(campaignId: () => string | undefined, filters: () => EntityFilters) {
      return TestBed.runInInjectionContext(() => service.list(campaignId, filters));
    }

    it('asks for the campaign entities without parameters when there are no filters', async () => {
      const list = listWith(() => 'c1', () => ({}));
      flushEffects();

      http.expectOne(URL).flush([PONENT]);
      await new Promise((resolve) => setTimeout(resolve));

      expect(list.value()).toEqual([PONENT]);
    });

    it('sends type, trimmed q and archived=true as query parameters', () => {
      listWith(() => 'c1', () => ({ type: 'npc', q: '  àlex ', archived: true }));
      flushEffects();

      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.params.get('type')).toBe('npc');
      expect(req.request.params.get('q')).toBe('àlex');
      expect(req.request.params.get('archived')).toBe('true');
      req.flush([]);
    });

    it('leaves out an empty search and archived=false', () => {
      listWith(() => 'c1', () => ({ q: '   ', archived: false }));
      flushEffects();

      const req = http.expectOne((r) => r.url === URL);
      expect(req.request.params.keys()).toEqual([]);
      req.flush([]);
    });

    it('asks again when the filters change', () => {
      const filters = signal<EntityFilters>({});
      listWith(() => 'c1', filters);
      flushEffects();
      http.expectOne(URL).flush([PONENT]);

      filters.set({ type: 'faction' });
      flushEffects();

      http.expectOne((r) => r.url === URL && r.params.get('type') === 'faction').flush([]);
    });

    it('makes no request while there is no campaign', () => {
      listWith(() => undefined, () => ({}));
      flushEffects();

      http.expectNone(() => true);
    });
  });

  it('get, create, update and remove use the entity URL', async () => {
    const data = { type: 'npc' as const, name: 'Brugal', description: null, imageUrl: null, isSecret: true };

    const got = service.get('c1', 'e1');
    http.expectOne({ method: 'GET', url: `${URL}/e1` }).flush(PONENT);
    expect(await got).toEqual(PONENT);

    const created = service.create('c1', data);
    const post = http.expectOne({ method: 'POST', url: URL });
    expect(post.request.body).toEqual(data);
    post.flush({ ...PONENT, id: 'e2' });
    expect((await created).id).toBe('e2');

    const updated = service.update('c1', 'e1', { isSecret: true });
    const patch = http.expectOne({ method: 'PATCH', url: `${URL}/e1` });
    expect(patch.request.body).toEqual({ isSecret: true });
    patch.flush({ ...PONENT, isSecret: true });
    expect((await updated).isSecret).toBe(true);

    const removed = service.remove('c1', 'e1');
    http.expectOne({ method: 'DELETE', url: `${URL}/e1` }).flush(null, { status: 204, statusText: 'No Content' });
    await removed;
  });

  it.each([
    ['reveal', 'reveal'],
    ['archive', 'archive'],
    ['unarchive', 'unarchive'],
  ] as const)('%s posts to .../:id/%s', async (method, verb) => {
    const result = service[method]('c1', 'e1');

    http.expectOne({ method: 'POST', url: `${URL}/e1/${verb}` }).flush(PONENT);

    expect(await result).toEqual(PONENT);
  });

  it('a 404 rejects the promise (secret or missing entity)', async () => {
    const got = service.get('c1', 'e9');
    http.expectOne(`${URL}/e9`).flush({ error: 'No trobat' }, { status: 404, statusText: 'Not Found' });

    await expect(got).rejects.toMatchObject({ status: 404 });
  });
});