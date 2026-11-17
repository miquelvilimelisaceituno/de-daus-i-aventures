import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';
import { By } from '@angular/platform-browser';

@Component({
  selector: 'app-button-host',
  imports: [Button],
  template: `<button appButton type="submit" [disabled]="disabled()">Entrar</button>`,
})
class Host {
  readonly disabled = signal(false);
}

@Component({
  selector: 'app-button-secondary-host',
  imports: [Button],
  template: `<button appButton variant="secundari" type="button">Tanca la sessió</button>`,
})
class SecondaryHost {}

describe('Button', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, button };
  }

  it('és un <button> natiu amb el text projectat', async () => {
    const { button } = await render();

    expect(button.textContent?.trim()).toBe('Entrar');
    expect(button.type).toBe('submit');
  });

  it('respecta l’atribut disabled natiu', async () => {
    const { fixture, button } = await render();

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(button.disabled).toBe(true);
  });

  it('el component s’aplica sobre el <button>', async () => {
    const { fixture } = await render();

    const applied = fixture.debugElement.query(By.directive(Button));

    expect(applied?.nativeElement.tagName).toBe('BUTTON');
  });

  it('per defecte és primari; amb variant="secundari" porta la classe secundari', async () => {
    const { button } = await render();
    expect(button.classList.contains('secundari')).toBe(false);

    const fixture = TestBed.createComponent(SecondaryHost);
    await fixture.whenStable();
    const secondary = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(secondary.classList.contains('secundari')).toBe(true);
  });
});
