import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CONNECTION_ERROR } from '../../shared/http/api-error';
import { Campaign } from '../campaign.model';
import { CampaignsPage } from './campaigns-page';

const URL = `${environment.apiUrl}/campaigns`;

const MASTER: Campaign = {
  id: 'c1',
  name: 'El final infinit',
  description: 'La campanya del grup',
  imageUrl: null,
  archivedAt: null,
  role: 'master',
  inviteCode: 'DRAC2024',
};
const PLAYER: Campaign = {
  id: 'c2',
  name: 'La cripta',
  description: null,
  imageUrl: null,
  archivedAt: '2026-11-01T10:00:00.000Z',
  role: 'player',
};

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('CampaignsPage', () => {
  let fixture: ComponentFixture<CampaignsPage>;
  let httpMock: HttpTestingController;
  let page: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CampaignsPage);
    page = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Answers the pending GET /api/campaigns and waits for the page to render. */
  async function flushList(body: object | string, options?: { status: number; statusText: string }) {
    TestBed.tick();
    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush(body, options);
    await stable();
  }

  // Not fixture.whenStable(): after a create or join the list reloads, and whenStable()
  // would wait for that GET, which these tests answer later with flushList().
  async function stable() {
    await settle();
    fixture.detectChanges();
    await settle();
  }

  function button(text: string): HTMLButtonElement {
    const found = [...page.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
    if (!found) throw new Error(`No button "${text}"`);
    return found;
  }

  async function openForm(text: string) {
    button(text).click();
    await stable();
  }

  async function typeAndSubmit(value: string) {
    const input = page.querySelector('form input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await stable();
  }

  const alert = () => page.querySelector('[role="alert"]')?.textContent?.trim();
  const status = () => page.querySelector('[role="status"]')?.textContent?.trim();
  const titles = () => [...page.querySelectorAll('article h2')].map((h) => h.textContent?.trim());

  describe('list', () => {
    it('shows each campaign with my role, and the archived label', async () => {
      await flushList([MASTER, PLAYER]);

      expect(titles()).toEqual(['El final infinit', 'La cripta']);
      const [master, player] = [...page.querySelectorAll('article')];
      expect(master.textContent).toContain('Màster');
      expect(master.textContent).not.toContain('Arxivada');
      expect(player.textContent).toContain('Jugador');
      expect(player.textContent).toContain('Arxivada');
    });

    it('shows the invite code only on the campaigns where I am the master', async () => {
      await flushList([MASTER, PLAYER]);

      const [master, player] = [...page.querySelectorAll('article')];
      expect(master.querySelector('.codi')?.textContent).toContain('DRAC2024');
      expect(player.querySelector('.codi')).toBeNull();
    });

    it('shows an empty state that points to create and join', async () => {
      await flushList([]);

      expect(page.querySelector('.buit')?.textContent).toContain('Encara no formes part de cap campanya');
      expect(button('Crea una campanya')).toBeTruthy();
      expect(button('Uneix-te amb un codi')).toBeTruthy();
    });

    it('recovers from a failed load with the retry button', async () => {
      await flushList('Error', { status: 500, statusText: 'Server Error' });
      expect(alert()).toContain('No s’han pogut carregar');

      button('Torna-ho a provar').click();
      await flushList([MASTER]);

      expect(alert()).toBeUndefined();
      expect(titles()).toEqual(['El final infinit']);
    });
  });

  describe('create a campaign', () => {
    beforeEach(async () => {
      await flushList([]);
      await openForm('Crea una campanya');
    });

    it('creates it, closes the form and reloads the list', async () => {
      await typeAndSubmit('  El final infinit  ');

      const req = httpMock.expectOne({ url: URL, method: 'POST' });
      expect(req.request.body).toEqual({ name: 'El final infinit' });
      req.flush(MASTER, { status: 201, statusText: 'Created' });
      await stable();

      expect(status()).toContain('Has creat «El final infinit»');
      expect(page.querySelector('form')).toBeNull();
      await flushList([MASTER]);
      expect(titles()).toEqual(['El final infinit']);
    });

    it('does not call the API when the name is too short', async () => {
      await typeAndSubmit('  ab ');

      expect(page.querySelector('.error')?.textContent).toContain('com a mínim 3 caràcters');
      httpMock.expectNone({ url: URL, method: 'POST' });
    });

    it('sends only one request when the form is submitted twice', async () => {
      await typeAndSubmit('El final infinit');
      page.querySelector('form')!.dispatchEvent(new Event('submit'));
      await stable();

      const requests = httpMock.match({ url: URL, method: 'POST' });
      expect(requests).toHaveLength(1);
      const [req] = requests;
      expect(button('Creant…').disabled).toBe(true);
      req.flush(MASTER, { status: 201, statusText: 'Created' });
      await stable();
      await flushList([MASTER]);
    });

    it('keeps the form and the typed name when the server cannot be reached', async () => {
      await typeAndSubmit('El final infinit');

      httpMock.expectOne({ url: URL, method: 'POST' }).error(new ProgressEvent('error'));
      await stable();

      expect(alert()).toBe(CONNECTION_ERROR);
      expect((page.querySelector('form input') as HTMLInputElement).value).toBe('El final infinit');
      expect(button('Crea-la').disabled).toBe(false);
    });
  });

  describe('join with a code', () => {
    beforeEach(async () => {
      await flushList([]);
      await openForm('Uneix-te amb un codi');
    });

    it('joins, shows the campaign and reloads the list', async () => {
      await typeAndSubmit(' drac2024 ');

      const req = httpMock.expectOne({ url: `${URL}/join`, method: 'POST' });
      expect(req.request.body).toEqual({ code: 'drac2024' });
      req.flush({ ...MASTER, role: 'player', inviteCode: undefined });
      await stable();

      expect(status()).toContain('T’has unit a «El final infinit»');
      await flushList([{ ...MASTER, role: 'player', inviteCode: undefined }]);
      expect(page.querySelector('article')?.textContent).toContain('Jugador');
    });

    it.each([
      [404, 'Codi no vàlid'],
      [409, 'Ja formes part d’aquesta campanya'],
      [403, 'Aquesta campanya no admet nous jugadors'],
    ])('shows the API message on a %i', async (statusCode, message) => {
      await typeAndSubmit('XXXX0000');

      httpMock
        .expectOne({ url: `${URL}/join`, method: 'POST' })
        .flush({ error: message }, { status: statusCode, statusText: 'Error' });
      await stable();

      expect(alert()).toBe(message);
    });

    it('clears the error when a later attempt succeeds', async () => {
      await typeAndSubmit('XXXX0000');
      httpMock
        .expectOne({ url: `${URL}/join`, method: 'POST' })
        .flush({ error: 'Codi no vàlid' }, { status: 404, statusText: 'Not Found' });
      await stable();
      expect(alert()).toBe('Codi no vàlid');

      await typeAndSubmit('DRAC2024');
      httpMock
        .expectOne({ url: `${URL}/join`, method: 'POST' })
        .flush({ ...MASTER, role: 'player', inviteCode: undefined });
      await stable();

      expect(alert()).toBeUndefined();
      expect(status()).toContain('T’has unit');
      await flushList([{ ...MASTER, role: 'player', inviteCode: undefined }]);
    });

    it('does not switch forms while a request is in flight', async () => {
      await typeAndSubmit('DRAC2024');

      button('Crea una campanya').click();
      await stable();
      expect(page.querySelector('h2.titol-formulari')?.textContent).toContain('Uneix-te');

      httpMock
        .expectOne({ url: `${URL}/join`, method: 'POST' })
        .flush({ error: 'Codi no vàlid' }, { status: 404, statusText: 'Not Found' });
      await stable();
      expect(alert()).toBe('Codi no vàlid');
    });
  });
});