import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AUTH_GATEWAY } from '../auth-gateway';
import { FakeAuthGateway } from '../testing/fake-auth-gateway';
import { RegisterPage } from './register-page';

const ME = `${environment.apiUrl}/me`;
const PROFILE = { id: 'uid-1', name: 'Miquel', avatarUrl: null, isAdmin: false };

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('RegisterPage', () => {
  let gateway: FakeAuthGateway;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function render() {
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

    const fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
    await settle();

    const page = fixture.nativeElement as HTMLElement;
    const [name, email, password] = Array.from(page.querySelectorAll('input'));
    return { fixture, page, name, email, password };
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

  it('registre correcte: crea el compte, envia el nom a l’API i va a /campanyes', async () => {
    const { fixture, page, name, email, password } = await render();
    type(name, '  Miquel  ');
    type(email, 'miquel@example.com');
    type(password, 'secret123');

    await submit(fixture, page);
    const req = httpMock.expectOne(ME);
    expect(req.request.body).toEqual({ name: 'Miquel' });
    req.flush(PROFILE);
    await settle();

    expect(gateway.calls).toEqual(['register:miquel@example.com']);
    expect(navigate).toHaveBeenCalledWith('/campanyes');
  });

  it('el nom és obligatori, també si només té espais', async () => {
    const { fixture, page, name, email, password } = await render();
    type(name, '   ');
    type(email, 'miquel@example.com');
    type(password, 'secret123');

    await submit(fixture, page);

    expect(page.textContent).toContain('El nom és obligatori');
    expect(gateway.calls).toEqual([]);
  });

  it('el nom no pot passar de 40 caràcters', async () => {
    const { fixture, page, name, email, password } = await render();
    type(name, 'a'.repeat(41));
    type(email, 'miquel@example.com');
    type(password, 'secret123');

    await submit(fixture, page);

    expect(page.textContent).toContain('El nom pot tenir com a màxim 40 caràcters');
    expect(gateway.calls).toEqual([]);
  });

  it('la contrasenya ha de tenir almenys 6 caràcters', async () => {
    const { fixture, page, name, email, password } = await render();
    type(name, 'Miquel');
    type(email, 'miquel@example.com');
    type(password, '12345');

    await submit(fixture, page);

    expect(page.textContent).toContain('La contrasenya ha de tenir almenys 6 caràcters');
    expect(gateway.calls).toEqual([]);
  });

  it('email ja registrat: mostra l’error i no surt del formulari', async () => {
    const { fixture, page, name, email, password } = await render();
    gateway.failWith = { code: 'auth/email-already-in-use' };
    type(name, 'Miquel');
    type(email, 'miquel@example.com');
    type(password, 'secret123');

    await submit(fixture, page);

    expect(page.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Ja hi ha un compte amb aquest email',
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(name.value).toBe('Miquel');
  });
});