import { TestBed } from '@angular/core/testing';
import { withInterceptors, HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth-interceptor';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AUTH_GATEWAY } from './auth-gateway';
import { FakeAuthGateway } from './testing/fake-auth-gateway';

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('authInterceptor', () => {
let gateway: FakeAuthGateway;
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    gateway = new FakeAuthGateway();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_GATEWAY, useValue: gateway },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function send(url: string) {
    const response = firstValueFrom(http.get(url));
    await settle();
    const req = httpMock.expectOne(url);
    req.flush({});
    await response;
    return req.request;
  }

  it('adds the Bearer token to API requests', async () => {
    gateway.token = 'token-1';

    const request = await send(`${environment.apiUrl}/campaigns`);

    expect(request.headers.get('Authorization')).toBe('Bearer token-1');
  });

  it('without a session, sends the request without the header', async () => {
    const request = await send(`${environment.apiUrl}/campaigns`);

    expect(request.headers.has('Authorization')).toBe(false);
  });

  it('does not send the token to other domains', async () => {
    gateway.token = 'token-1';

    const request = await send('https://example.com/api/campaigns');

    expect(request.headers.has('Authorization')).toBe(false);
  });

  it('does not send it to a URL that only starts like the API', async () => {
    gateway.token = 'token-1';

    const request = await send(`${environment.apiUrl}-falsa/campaigns`);

    expect(request.headers.has('Authorization')).toBe(false);
  });
});
