import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CampaignDetail } from './campaign.model';
import { CampaignContext } from './campaign-context.service';

const URL = `${environment.apiUrl}/campaigns`;

function detail(id: string, overrides: Partial<CampaignDetail> = {}): CampaignDetail {
  return { id, name: `Campaign ${id}`, description: null, imageUrl: null, archivedAt: null, role: 'player', ...overrides };
}

describe('CampaignContext', () => {
  let context: CampaignContext;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    context = TestBed.inject(CampaignContext);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads the campaign and exposes my role', async () => {
    const loaded = context.load('c1');
    httpMock.expectOne(`${URL}/c1`).flush(detail('c1', { role: 'master', inviteCode: 'DRAC2024' }));

    await expect(loaded).resolves.toBe(true);
    expect(context.campaign()?.id).toBe('c1');
    expect(context.isMaster()).toBe(true);
    expect(context.isArchived()).toBe(false);
  });

  it('knows when the campaign is archived', async () => {
    const loaded = context.load('c1');
    httpMock.expectOne(`${URL}/c1`).flush(detail('c1', { archivedAt: '2026-11-01T10:00:00.000Z' }));
    await loaded;

    expect(context.isArchived()).toBe(true);
  });

  it('resolves false and forgets the campaign when I am not an active member (403)', async () => {
    const first = context.load('c1');
    httpMock.expectOne(`${URL}/c1`).flush(detail('c1'));
    await first;

    const again = context.load('c1');
    httpMock.expectOne(`${URL}/c1`).flush({ error: 'No ets membre' }, { status: 403, statusText: 'Forbidden' });

    await expect(again).resolves.toBe(false);
    expect(context.campaign()).toBeNull();
  });

  it('rethrows other errors, so the caller can tell "no access" from "server down"', async () => {
    const loaded = context.load('c1');
    httpMock.expectOne(`${URL}/c1`).error(new ProgressEvent('error'));

    await expect(loaded).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('shares one request when the same campaign is asked for twice at once', async () => {
    const first = context.load('c1');
    const second = context.load('c1');

    httpMock.expectOne(`${URL}/c1`).flush(detail('c1'));

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });

  it('ignores a late answer for a campaign the user has already left', async () => {
    const toA = context.load('a');
    const toB = context.load('b');
    const [reqA] = httpMock.match(`${URL}/a`);
    const [reqB] = httpMock.match(`${URL}/b`);

    reqB.flush(detail('b'));
    await toB;
    reqA.flush(detail('a'));
    await toA;

    expect(context.campaign()?.id).toBe('b');
  });

  it('does not ask again with ensure() for the campaign it already has', async () => {
    const loaded = context.load('c1');
    httpMock.expectOne(`${URL}/c1`).flush(detail('c1'));
    await loaded;

    await expect(context.ensure('c1')).resolves.toBe(true);
    httpMock.expectNone(`${URL}/c1`);
  });

  it('loads with ensure() when it has another campaign', async () => {
    const ensured = context.ensure('c2');
    httpMock.expectOne(`${URL}/c2`).flush(detail('c2'));

    await expect(ensured).resolves.toBe(true);
    expect(context.campaign()?.id).toBe('c2');
  });
});