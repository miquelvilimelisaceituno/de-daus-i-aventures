import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CampaignsPage } from './campaigns-page';

describe('CampaignsPage', () => {
  let fixture: ComponentFixture<CampaignsPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignsPage);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Crea el component, espera la petició a l'API i hi respon amb les dades de prova.
  async function respondWith(body: object | string, options?: { status: number; statusText: string }) {
    TestBed.tick();
    const req = httpMock.expectOne(`${environment.apiUrl}/campaigns`);
    expect(req.request.method).toBe('GET');
    req.flush(body, options);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it("mostra les campanyes que retorna l'API", async () => {
    const page = await respondWith([
      { id: '1', name: 'El final infinit', description: 'La campanya del grup', imageUrl: null },
      { id: '2', name: 'Campanya de prova', description: null, imageUrl: null },
    ]);

    const titles = [...page.querySelectorAll('article h2')].map((h) => h.textContent?.trim());
    expect(titles).toEqual(['El final infinit', 'Campanya de prova']);
  });

  it('mostra un missatge si no hi ha cap campanya', async () => {
    const page = await respondWith([]);

    expect(page.textContent).toContain('Encara no hi ha cap campanya');
  });

  it("mostra un error si l'API falla", async () => {
    const page = await respondWith('Error', { status: 500, statusText: 'Server Error' });

    expect(page.querySelector('[role="alert"]')?.textContent).toContain("No s'han pogut carregar");
  });
});
