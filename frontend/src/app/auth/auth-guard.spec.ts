import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../environments/environment';
import { AUTH_GATEWAY } from './auth-gateway';
import { authGuard } from './auth-guard';
import { FakeAuthGateway } from './testing/fake-auth-gateway';

@Component({ template: 'privada' })
class PrivatePage {}

@Component({ template: 'login' })
class LoginStub {}

const PROFILE = { id: 'uid-1', name: 'Miquel', avatarUrl: null, isAdmin: false };

describe('authGuard', () => {
  let gateway: FakeAuthGateway;

  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: LoginStub },
          { path: 'c/:id/diari', component: PrivatePage, canActivate: [authGuard] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_GATEWAY, useValue: gateway },
      ],
    });
    return RouterTestingHarness.create();
  }

  beforeEach(() => {
    gateway = new FakeAuthGateway();
  });

  it('sense sessió, redirigeix a /login amb returnUrl', async () => {
    const harness = await setup();

    await harness.navigateByUrl('/c/7/diari');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fc%2F7%2Fdiari');
    expect(harness.routeNativeElement?.textContent).toBe('login');
  });

  it('amb sessió, deixa entrar', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const harness = await setup();
    const navigation = harness.navigateByUrl('/c/7/diari');

    // El guard espera que l'AuthService tingui el perfil.
    await new Promise<void>((resolve) => setTimeout(resolve));
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/me`).flush(PROFILE);
    await navigation;

    expect(TestBed.inject(Router).url).toBe('/c/7/diari');
    expect(harness.routeNativeElement?.textContent).toBe('privada');
  });
});