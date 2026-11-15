import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../environments/environment';
import { AUTH_GATEWAY } from './auth-gateway';
import { guestGuard } from './guest-guard';
import { FakeAuthGateway } from './testing/fake-auth-gateway';

@Component({ template: 'login' })
class LoginStub {}

@Component({ template: 'campanyes' })
class CampaignsStub {}

const PROFILE = { id: 'uid-1', name: 'Miquel', avatarUrl: null, isAdmin: false };

describe('guestGuard', () => {
  let gateway: FakeAuthGateway;

  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'campanyes', component: CampaignsStub },
          { path: 'login', component: LoginStub, canActivate: [guestGuard] },
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

  it('sense sessió, mostra el login', async () => {
    const harness = await setup();

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('amb sessió, envia a /campanyes', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const harness = await setup();
    const navigation = harness.navigateByUrl('/login');

    await new Promise<void>((resolve) => setTimeout(resolve));
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/me`).flush(PROFILE);
    await navigation;

    expect(TestBed.inject(Router).url).toBe('/campanyes');
    expect(harness.routeNativeElement?.textContent).toBe('campanyes');
  });
});