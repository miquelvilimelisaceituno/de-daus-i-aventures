import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AUTH_GATEWAY } from './auth/auth-gateway';
import { FakeAuthGateway } from './auth/testing/fake-auth-gateway';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // La capçalera fa servir l'AuthService: cal el gateway fals i l'HttpClient de proves.
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_GATEWAY, useValue: new FakeAuthGateway() },
      ]
    })
      .compileComponents();
  });

  it('es crea amb la capçalera', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-header')).not.toBeNull();
  });

});
