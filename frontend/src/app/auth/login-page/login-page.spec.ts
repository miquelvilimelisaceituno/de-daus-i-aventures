import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AUTH_GATEWAY } from '../auth-gateway';
import { FakeAuthGateway } from '../testing/fake-auth-gateway';
import { LoginPage } from './login-page';

const ME = `${environment.apiUrl}/me`;
const PROFILE = { id: 'uid-1', name: 'Miquel', avatarUrl: null, isAdmin: false };

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('LoginPage', () => {
  let gateway: FakeAuthGateway;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function render(returnUrl?: string) {
    gateway = new FakeAuthGateway();
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

    const fixture = TestBed.createComponent(LoginPage);
    if (returnUrl) fixture.componentRef.setInput('returnUrl', returnUrl);
    await fixture.whenStable();
    await settle(); // l'AuthService rep "sense sessió" del gateway

    const page = fixture.nativeElement as HTMLElement;
    const [email, password] = Array.from(page.querySelectorAll('input'));
    return { fixture, page, email, password };
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

  it('with an empty form, shows the errors and does not call Firebase', async () => {
    const { fixture, page } = await render();

    await submit(fixture, page);

    expect(page.textContent).toContain('L’email és obligatori');
    expect(page.textContent).toContain('La contrasenya és obligatòria');
    expect(gateway.calls).toEqual([]);
  });

  it('warns if the email format is not valid', async () => {
    const { fixture, page, email, password } = await render();
    type(email, 'no-es-un-email');
    type(password, 'secret123');

    await submit(fixture, page);

    expect(page.textContent).toContain('L’email no té un format vàlid');
    expect(gateway.calls).toEqual([]);
  });

  it('with valid credentials, signs in and goes to /campanyes', async () => {
    const { fixture, page, email, password } = await render();
    type(email, 'miquel@example.com');
    type(password, 'secret123');

    await submit(fixture, page);
    expect(page.querySelector('button')!.textContent).toContain('Entrant…');
    httpMock.expectOne(ME).flush(PROFILE);
    await settle();

    expect(gateway.calls).toEqual(['signIn:miquel@example.com']);
    expect(navigate).toHaveBeenCalledWith('/campanyes');
  });

  it('returns to the internal returnUrl route', async () => {
    const { fixture, page, email, password } = await render('/c/7/diari');
    type(email, 'miquel@example.com');
    type(password, 'secret123');

    await submit(fixture, page);
    httpMock.expectOne(ME).flush(PROFILE);
    await settle();

    expect(navigate).toHaveBeenCalledWith('/c/7/diari');
  });

  it('ignores an external returnUrl', async () => {
    const { fixture, page, email, password } = await render('https://web-falsa.com');
    type(email, 'miquel@example.com');
    type(password, 'secret123');

    await submit(fixture, page);
    httpMock.expectOne(ME).flush(PROFILE);
    await settle();

    expect(navigate).toHaveBeenCalledWith('/campanyes');
  });

  it('with wrong credentials, shows the error without saying which field is wrong', async () => {
    const { fixture, page, email, password } = await render();
    gateway.failWith = { code: 'auth/invalid-credential' };
    type(email, 'miquel@example.com');
    type(password, 'dolenta');

    await submit(fixture, page);

    expect(page.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Email o contrasenya incorrectes',
    );
    expect(page.querySelector('button')!.disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});