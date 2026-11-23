import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { CampaignContext } from './campaign-context.service';
import { masterGuard } from './master-guard';
import { routeWith } from './testing/route-with';

describe('masterGuard', () => {
  let ensure: ReturnType<typeof vi.fn>;
  let isMaster: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ensure = vi.fn().mockResolvedValue(true);
    isMaster = vi.fn().mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CampaignContext, useValue: { ensure, isMaster } }],
    });
  });

  // As in the app: /c/:id/config is a child of /c/:id, so the id is on the parent.
  function run() {
    const route = routeWith({}, routeWith({ id: 'c1' }));
    return TestBed.runInInjectionContext(() =>
      masterGuard(route, {} as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;
  }

  const serialize = (result: boolean | UrlTree) =>
    result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

  it('lets the master in', async () => {
    expect(await run()).toBe(true);
    expect(ensure).toHaveBeenCalledWith('c1');
  });

  it('sends a player back to the campaign home', async () => {
    isMaster.mockReturnValue(false);

    expect(serialize(await run())).toBe('/c/c1');
  });

  it('sends the user back to the campaign home when the API cannot be reached', async () => {
    ensure.mockRejectedValue(new Error('offline'));

    expect(serialize(await run())).toBe('/c/c1');
  });
});