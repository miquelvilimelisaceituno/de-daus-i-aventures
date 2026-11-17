import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { AUTH_GATEWAY } from './auth-gateway';
import { Profile } from './auth.model';
import { FakeAuthGateway } from './testing/fake-auth-gateway';

const ME = `${environment.apiUrl}/me`;
const PROFILE: Profile = { id: 'uid-1', name: 'Miquel', avatarUrl: null, isAdmin: false };

// Espera que s'executin les promeses pendents (notificacions de Firebase, respostes HTTP).
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('AuthService', () => {
    let gateway: FakeAuthGateway;
  let httpMock: HttpTestingController;

  function createService() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_GATEWAY, useValue: gateway },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    gateway = new FakeAuthGateway();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('comença en loading i passa a signedOut si no hi ha sessió', async () => {
    const auth = createService();
    expect(auth.status()).toBe('loading');

    await auth.whenSettled();

    expect(auth.status()).toBe('signedOut');
    expect(auth.profile()).toBeNull();
  });

  it('amb una sessió desada, crida POST /api/me i desa el perfil', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const auth = createService();
    await settle();

    const req = httpMock.expectOne(ME);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(PROFILE);
    await auth.whenSettled();

    expect(auth.status()).toBe('signedIn');
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.profile()).toEqual(PROFILE);
  });

  it('login: inicia sessió a Firebase i espera el perfil abans de resoldre', async () => {
    const auth = createService();
    await auth.whenSettled();

    let done = false;
    const login = auth.login(' miquel@example.com ', 'secret123').then(() => (done = true));
    await settle();
    expect(gateway.calls).toEqual(['signIn:miquel@example.com']);
    expect(done).toBe(false);

    httpMock.expectOne(ME).flush(PROFILE);
    await login;

    expect(auth.status()).toBe('signedIn');
    expect(auth.profile()?.name).toBe('Miquel');
  });

  it('login: si Firebase el rebutja, llança l’error i torna a signedOut', async () => {
    const auth = createService();
    await auth.whenSettled();
    gateway.failWith = { code: 'auth/invalid-credential' };

    await expect(auth.login('miquel@example.com', 'dolenta')).rejects.toEqual({
      code: 'auth/invalid-credential',
    });

    expect(auth.status()).toBe('signedOut');
    httpMock.expectNone(ME);
  });

  it('register: envia el nom triat a POST /api/me', async () => {
    const auth = createService();
    await auth.whenSettled();

    const register = auth.register('  Miquel  ', 'miquel@example.com', 'secret123');
    await settle();

    const req = httpMock.expectOne(ME);
    expect(req.request.body).toEqual({ name: 'Miquel' });
    req.flush(PROFILE);
    await register;

    expect(auth.profile()).toEqual(PROFILE);
  });

  it('register: si falla, no reaprofita el nom en el login següent', async () => {
    const auth = createService();
    await auth.whenSettled();
    gateway.failWith = { code: 'auth/email-already-in-use' };
    await expect(auth.register('Miquel', 'miquel@example.com', 'secret123')).rejects.toBeTruthy();

    gateway.failWith = null;
    const login = auth.login('miquel@example.com', 'secret123');
    await settle();

    const req = httpMock.expectOne(ME);
    expect(req.request.body).toEqual({});
    req.flush(PROFILE);
    await login;
  });

  it('si l’API falla, hi ha sessió però marca profileError', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const auth = createService();
    await settle();

    httpMock.expectOne(ME).flush('Error', { status: 503, statusText: 'Unavailable' });
    await auth.whenSettled();

    expect(auth.status()).toBe('signedIn');
    expect(auth.profile()).toBeNull();
    expect(auth.profileError()).toBe(true);

    const reload = auth.reloadProfile();
    httpMock.expectOne(ME).flush(PROFILE);
    await reload;
    expect(auth.profileError()).toBe(false);
    expect(auth.profile()).toEqual(PROFILE);
  });

  it('logout: tanca la sessió i esborra el perfil', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const auth = createService();
    await settle();
    httpMock.expectOne(ME).flush(PROFILE);
    await auth.whenSettled();

    await auth.logout();

    expect(gateway.calls).toEqual(['signOut']);
    expect(auth.status()).toBe('signedOut');
    expect(auth.profile()).toBeNull();
  });

  it('descarta la resposta del perfil si mentrestant l’usuari ha tancat la sessió', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const auth = createService();
    await settle();
    const pending = httpMock.expectOne(ME);

    gateway.emit(null);
    pending.flush(PROFILE);
    await settle();

    expect(auth.status()).toBe('signedOut');
    expect(auth.profile()).toBeNull();
  });

    it('updateProfile: envia els canvis amb PATCH i actualitza el perfil', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const auth = createService();
    await settle();
    httpMock.expectOne(ME).flush(PROFILE);
    await auth.whenSettled();

    const update = auth.updateProfile({ name: 'Miquel el Savi', avatarUrl: null });
    const req = httpMock.expectOne(ME);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Miquel el Savi', avatarUrl: null });
    req.flush({ ...PROFILE, name: 'Miquel el Savi' });
    await update;

    expect(auth.profile()?.name).toBe('Miquel el Savi');
  });

  it('updateProfile: si l’API falla, llança l’error i no toca el perfil', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const auth = createService();
    await settle();
    httpMock.expectOne(ME).flush(PROFILE);
    await auth.whenSettled();

    const update = auth.updateProfile({ name: 'x' });
    httpMock.expectOne(ME).flush({ error: 'Dades no vàlides' }, { status: 400, statusText: 'Bad Request' });

    await expect(update).rejects.toBeTruthy();
    expect(auth.profile()).toEqual(PROFILE);
  });
});
