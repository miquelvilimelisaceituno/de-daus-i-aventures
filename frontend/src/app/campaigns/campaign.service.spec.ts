import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Campaign } from './campaign.model';
import { CampaignService } from './campaign.service';
import { signal } from '@angular/core';

const URL = `${environment.apiUrl}/campaigns`;
const CAMPAIGN: Campaign = {
  id: 'c1',
  name: 'El final infinit',
  description: null,
  imageUrl: null,
  archivedAt: null,
  role: 'master',
  inviteCode: 'DRAC2024',
};

describe('CampaignService', () => {
  let service: CampaignService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CampaignService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates a campaign with POST /api/campaigns', async () => {
    const created = service.create({ name: 'El final infinit' });

    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'El final infinit' });
    req.flush(CAMPAIGN, { status: 201, statusText: 'Created' });

    await expect(created).resolves.toEqual(CAMPAIGN);
  });

  it('joins a campaign with POST /api/campaigns/join', async () => {
    const joined = service.join('DRAC2024');

    const req = httpMock.expectOne(`${URL}/join`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'DRAC2024' });
    req.flush({ ...CAMPAIGN, role: 'player', inviteCode: undefined });

    await expect(joined).resolves.toMatchObject({ id: 'c1', role: 'player' });
  });

  it('rejects with the HTTP error so the page can show the API message', async () => {
    const joined = service.join('XXXX0000');

    httpMock
      .expectOne(`${URL}/join`)
      .flush({ error: 'Codi no vàlid' }, { status: 404, statusText: 'Not Found' });

    const error = await joined.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).error).toEqual({ error: 'Codi no vàlid' });
  });

  it('keeps two requests in flight independent of each other', async () => {
    const first = service.join('AAAA1111');
    const second = service.join('BBBB2222');

    const [firstReq, secondReq] = httpMock.match(`${URL}/join`);
    // The second answer arrives first: each promise still gets its own response.
    secondReq.flush({ ...CAMPAIGN, id: 'c2', role: 'player' });
    firstReq.flush({ error: 'Codi no vàlid' }, { status: 404, statusText: 'Not Found' });

    await expect(second).resolves.toMatchObject({ id: 'c2' });
    await expect(first).rejects.toBeInstanceOf(HttpErrorResponse);
  });

    it('gets the detail of one campaign with GET /api/campaigns/:id', async () => {
    const detail = service.get('c1');

    const req = httpMock.expectOne(`${URL}/c1`);
    expect(req.request.method).toBe('GET');
    req.flush({ ...CAMPAIGN, inviteOpen: true, maxPlayers: 6 });

    await expect(detail).resolves.toMatchObject({ id: 'c1', inviteOpen: true, maxPlayers: 6 });
  });
    it('updates the invitations with PATCH /api/campaigns/:id', async () => {
    const updated = service.update('c1', { inviteOpen: false, maxPlayers: 4 });

    const req = httpMock.expectOne(`${URL}/c1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ inviteOpen: false, maxPlayers: 4 });
    req.flush({ ...CAMPAIGN, inviteOpen: false, maxPlayers: 4 });

    await expect(updated).resolves.toMatchObject({ inviteOpen: false, maxPlayers: 4 });
  });

  it('regenerates the invite code and returns only the code', async () => {
    const code = service.regenerateInviteCode('c1');

    const req = httpMock.expectOne(`${URL}/c1/invite-code`);
    expect(req.request.method).toBe('POST');
    req.flush({ inviteCode: 'NOU12345' });

    await expect(code).resolves.toBe('NOU12345');
  });

  it('removes a member with DELETE /api/campaigns/:id/members/:userId', async () => {
    const removed = service.removeMember('c1', 'u2');

    const req = httpMock.expectOne(`${URL}/c1/members/u2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(removed).resolves.toBeNull();
  });

  it('loads the members only once there is a campaign id', async () => {
    const id = signal<string | undefined>(undefined);
    const members = TestBed.runInInjectionContext(() => service.members(id));

    TestBed.tick();
    httpMock.expectNone(() => true);

    id.set('c1');
    TestBed.tick();
    httpMock.expectOne(`${URL}/c1/members`).flush([{ userId: 'u1', name: 'Miquel', role: 'master' }]);
    await new Promise((resolve) => setTimeout(resolve));

    expect(members.value()).toHaveLength(1);
  });
});