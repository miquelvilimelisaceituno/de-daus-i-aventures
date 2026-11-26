import { TestBed } from '@angular/core/testing';
import { Card } from './card';
import { Component } from '@angular/core';

@Component({
  imports: [Card],
  template: `<app-card><h2>Miquel</h2></app-card>`,
})
class Host {}

describe('Card', () => {
  it('shows the projected content', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const card = (fixture.nativeElement as HTMLElement).querySelector('app-card')!;
    expect(card.querySelector('h2')?.textContent).toBe('Miquel');
  });
});
