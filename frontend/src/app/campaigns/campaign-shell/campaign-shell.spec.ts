import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CampaignContext } from '../campaign-context.service';
import { CampaignShell } from './campaign-shell';

@Component({ selector: 'app-test-section', template: '<p>Section</p>' })
class TestSection {}

describe('CampaignShell', () => {
  const isMaster = signal(false);

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'c/:id', component: CampaignShell, children: [{ path: '', component: TestSection }] }]),
        { provide: CampaignContext, useValue: { campaign: signal({ name: 'El final infinit' }), isMaster } },
      ],
    });
    const harness = await RouterTestingHarness.create('/c/c1');
    return harness.fixture.nativeElement as HTMLElement;
  }

  const labels = (page: HTMLElement) => [...page.querySelectorAll('nav a')].map((a) => a.textContent?.trim());

  it('shows the campaign sections, with links inside the campaign', async () => {
    isMaster.set(false);
    const page = await render();

    expect(labels(page)).toEqual(['Diari', 'Compendi', 'Calendari', 'Mapa']);
    expect(page.querySelector('a[href="/c/c1/compendi"]')).not.toBeNull();
  });

  it('adds the settings link only for the master', async () => {
    isMaster.set(true);
    const page = await render();

    expect(labels(page)).toContain('Configuració');
    expect(page.querySelector('a[href="/c/c1/config"]')).not.toBeNull();
  });

  it('marks the current section as active', async () => {
    isMaster.set(false);
    const page = await render();

    const diary = page.querySelector('nav a')!;
    expect(diary.classList).toContain('actiu');
    expect(diary.getAttribute('aria-current')).toBe('page');
  });
});