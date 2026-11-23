import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { CampaignContext } from './campaign-context.service';
import { campaignIdFrom, campaignMemberGuard } from './campaign-member-guard';
import { routeWith } from './testing/route-with';

describe('campaignMemberGuard', () => {
  let load: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    load = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CampaignContext, useValue: { load } }],
    });
  });

  function run(route = routeWith({ id: 'c1' })) {
    return TestBed.runInInjectionContext(() =>
      campaignMemberGuard(route, {} as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;
  }

  const serialize = (result: boolean | UrlTree) =>
    result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

  it('lets an active member in, after loading the campaign', async () => {
    load.mockResolvedValue(true);

    expect(await run()).toBe(true);
    expect(load).toHaveBeenCalledWith('c1');
  });

  it('sends a non-member back to /campanyes', async () => {
    load.mockResolvedValue(false);

    expect(serialize(await run())).toBe('/campanyes');
  });

  it('sends the user back to /campanyes when the API cannot be reached', async () => {
    load.mockRejectedValue(new Error('offline'));

    expect(serialize(await run())).toBe('/campanyes');
  });
});

describe('campaignIdFrom', () => {
  it('finds the id on a parent route', () => {
    const parent = routeWith({ id: 'c1' });

    expect(campaignIdFrom(routeWith({}, parent))).toBe('c1');
  });

  it('returns null when there is no id', () => {
    expect(campaignIdFrom(routeWith({}))).toBeNull();
  });
});