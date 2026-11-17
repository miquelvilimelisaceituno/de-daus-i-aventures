import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Field } from './field';

@Component({
  imports: [Field, ReactiveFormsModule],
  template: `<app-field label="Email" type="email" [formControl]="control" [error]="error()" />`,
})
class Host {
  readonly control = new FormControl('', { nonNullable: true });
  readonly error = signal<string | null>(null);
}

describe('Field', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      element,
      input: element.querySelector('input')!,
      label: element.querySelector('label')!,
    };
  }

  it('enllaça l’etiqueta amb l’input', async () => {
    const { input, label } = await render();

    expect(label.textContent?.trim()).toBe('Email');
    expect(label.htmlFor).toBe(input.id);
    expect(input.type).toBe('email');
  });

  it('mostra el valor del formulari i li envia el que s’escriu', async () => {
    const { fixture, host, input } = await render();

    host.control.setValue('miquel@example.com');
    await fixture.whenStable();
    expect(input.value).toBe('miquel@example.com');

    input.value = 'laia@example.com';
    input.dispatchEvent(new Event('input'));
    expect(host.control.value).toBe('laia@example.com');
  });

  it('marca el control com a tocat en sortir del camp', async () => {
    const { host, input } = await render();

    input.dispatchEvent(new Event('blur'));

    expect(host.control.touched).toBe(true);
  });

  it('sense error, no mostra missatge ni marca l’input com a invàlid', async () => {
    const { element, input } = await render();

    expect(element.querySelector('.error')).toBeNull();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('amb error, el mostra i l’associa a l’input per als lectors de pantalla', async () => {
    const { fixture, host, element, input } = await render();

    host.error.set('L’email és obligatori');
    await fixture.whenStable();

    const message = element.querySelector('.error')!;
    expect(message.textContent?.trim()).toBe('L’email és obligatori');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('es desactiva quan es desactiva el control', async () => {
    const { fixture, host, input } = await render();

    host.control.disable();
    await fixture.whenStable();

    expect(input.disabled).toBe(true);
  });
});