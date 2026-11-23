import { TestBed } from '@angular/core/testing';
import { ComingSoon } from './coming-soon';

describe('ComingSoon', () => {
  it('shows the section title', async () => {
    const fixture = TestBed.createComponent(ComingSoon);
    fixture.componentRef.setInput('title', 'Compendi');
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe('Compendi');
  });
});