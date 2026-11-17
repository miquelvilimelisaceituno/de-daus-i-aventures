import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AUTH_GATEWAY } from '../auth-gateway';
import { AuthService } from '../auth.service';
import { FakeAuthGateway } from '../testing/fake-auth-gateway';
import { ProfilePage } from './profile-page';

const ME = `${environment.apiUrl}/me`;
const PROFILE = { id: 'uid-1', name: 'Miquel', avatarUrl: null, isAdmin: false };

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('ProfilePage', () => {
  let gateway: FakeAuthGateway;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  // Com a l'app: l'authGuard espera que l'AuthService tingui la sessió abans d'obrir la pàgina.
  async function render(profileResponse: object = PROFILE, status = 200) {
    gateway = new FakeAuthGateway();
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_GATEWAY, useValue: gateway },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const auth = TestBed.inject(AuthService);
    await settle();
    httpMock
      .expectOne(ME)
      .flush(profileResponse, status === 200 ? undefined : { status, statusText: 'Error' });
    await auth.whenSettled();

    const fixture = TestBed.createComponent(ProfilePage);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return { fixture, page };
  }

  function inputs(page: HTMLElement) {
    const [name, avatar] = Array.from(page.querySelectorAll('input'));
    return { name, avatar };
  }

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(fixture: { whenStable(): Promise<unknown> }, page: HTMLElement) {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
    await fixture.whenStable();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('mostra el perfil i omple el formulari', async () => {
    const { page } = await render();

    expect(page.querySelector('.nom')?.textContent).toBe('Miquel');
    expect(page.querySelector('.inicial')?.textContent?.trim()).toBe('M');
    expect(inputs(page).name.value).toBe('Miquel');
    expect(inputs(page).avatar.value).toBe('');
  });

  it('desa el nom i l’avatar amb PATCH /api/me', async () => {
    const { fixture, page } = await render();
    const { name, avatar } = inputs(page);
    type(name, '  Miquel el Savi ');
    type(avatar, 'https://example.com/miquel.png');

    await submit(fixture, page);
    const req = httpMock.expectOne(ME);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      name: 'Miquel el Savi',
      avatarUrl: 'https://example.com/miquel.png',
    });
    req.flush({ ...PROFILE, name: 'Miquel el Savi', avatarUrl: 'https://example.com/miquel.png' });
    await settle();
    await fixture.whenStable();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Canvis desats');
    expect(page.querySelector('.nom')?.textContent).toBe('Miquel el Savi');
    expect(page.querySelector('img.avatar')?.getAttribute('src')).toBe('https://example.com/miquel.png');
  });

  it('un avatar buit s’envia com a null (treure l’avatar)', async () => {
    const { fixture, page } = await render({ ...PROFILE, avatarUrl: 'https://example.com/a.png' });
    type(inputs(page).avatar, '   ');

    await submit(fixture, page);
    const req = httpMock.expectOne(ME);
    expect(req.request.body).toEqual({ name: 'Miquel', avatarUrl: null });
    req.flush(PROFILE);
    await settle();
  });

  it('valida el nom i l’adreça de l’avatar abans d’enviar', async () => {
    const { fixture, page } = await render();
    const { name, avatar } = inputs(page);
    type(name, '');
    type(avatar, 'javascript:alert(1)');

    await submit(fixture, page);

    expect(page.textContent).toContain('El nom és obligatori');
    expect(page.textContent).toContain('Ha de ser una adreça que comenci per http:// o https://');
    httpMock.expectNone(ME);
  });

  it('si l’API falla en desar, ho diu i manté el que s’ha escrit', async () => {
    const { fixture, page } = await render();
    type(inputs(page).name, 'Miquel el Savi');

    await submit(fixture, page);
    httpMock.expectOne(ME).flush({ error: 'Error' }, { status: 500, statusText: 'Error' });
    await settle();
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'No s’han pogut desar els canvis',
    );
    expect(inputs(page).name.value).toBe('Miquel el Savi');
  });

  it('si el perfil no s’ha pogut carregar, permet tornar-ho a provar', async () => {
    const { fixture, page } = await render({ error: 'Error' }, 503);

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'No s’ha pogut carregar el perfil',
    );
    const retry = Array.from(page.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Torna-ho a provar'),
    )!;
    retry.click();
    httpMock.expectOne(ME).flush(PROFILE);
    await settle();
    await fixture.whenStable();

    expect(inputs(page).name.value).toBe('Miquel');
  });

  it('tanca la sessió i va al login', async () => {
    const { page } = await render();
    const logout = Array.from(page.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Tanca la sessió'),
    )!;

    logout.click();
    await settle();

    expect(gateway.calls).toContain('signOut');
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});