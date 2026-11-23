import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Campaign } from './campaign.model';
import { CampaignService } from './campaign.service';

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
});