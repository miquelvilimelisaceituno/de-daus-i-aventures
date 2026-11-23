import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Field } from './field';
import { UniqueIdService } from '../../unique-id.service';

@Component({
  selector: 'app-field-host',
  imports: [Field, ReactiveFormsModule],
  template: `<app-field label="Email" type="email" [formControl]="control" [error]="error()" />`,
})
class Host {
  readonly control = new FormControl('', { nonNullable: true });
  readonly error = signal<string | null>(null);
}

@Component({
  selector: 'app-two-fields-host',
  imports: [Field],
  template: `
    <app-field label="Email" [error]="'Required'" />
    <app-field label="Password" [error]="'Required'" />
  `,
})
class TwoFieldsHost {}

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

    it('gives each field its own ids, so labels and errors never collide', async () => {
    const fixture = TestBed.createComponent(TwoFieldsHost);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const [first, second] = Array.from(element.querySelectorAll('input'));
    const [firstLabel, secondLabel] = Array.from(element.querySelectorAll('label'));

    expect(first.id).not.toBe(second.id);
    expect(firstLabel.htmlFor).toBe(first.id);
    expect(secondLabel.htmlFor).toBe(second.id);
    expect(first.getAttribute('aria-describedby')).not.toBe(second.getAttribute('aria-describedby'));
  });

  it('takes its id from UniqueIdService', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: UniqueIdService, useValue: { next: (prefix: string) => `${prefix}-test` } }],
    });

    const { input, label } = await render();

    expect(input.id).toBe('camp-test');
    expect(label.htmlFor).toBe('camp-test');
  });
});