import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AUTH_GATEWAY } from '../../auth/auth-gateway';
import { FakeAuthGateway } from '../../auth/testing/fake-auth-gateway';
import { Header } from './header';

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('Header', () => {
  let gateway: FakeAuthGateway;

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_GATEWAY, useValue: gateway },
      ],
    });
    const fixture = TestBed.createComponent(Header);
    await settle();
    return fixture;
  }

  beforeEach(() => {
    gateway = new FakeAuthGateway();
  });

  it('without a session, only shows the logo', async () => {
    const fixture = await render();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.logo')?.getAttribute('href')).toBe('/campanyes');
    expect(element.querySelector('.perfil')).toBeNull();
  });

  it('with a session, shows the name with the link to the profile', async () => {
    gateway.user = { uid: 'uid-1', email: 'miquel@example.com' };
    const fixture = await render();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/me`)
      .flush({ id: 'uid-1', name: 'Miquel', avatarUrl: null, isAdmin: false });
    await settle();
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector('.perfil')!;
    expect(link.textContent?.trim()).toBe('Miquel');
    expect(link.getAttribute('href')).toBe('/perfil');
  });
});