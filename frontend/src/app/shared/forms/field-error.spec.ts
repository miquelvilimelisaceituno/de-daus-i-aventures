import { FormControl, Validators } from '@angular/forms';
import { fieldError } from './field-error';

const MESSAGES = { required: 'Obligatori', maxlength: 'Massa llarg' };

describe('fieldError', () => {
  it('no mostra res si el camp és vàlid', () => {
    const control = new FormControl('Miquel', Validators.required);
    control.markAsTouched();

    expect(fieldError(control, true, MESSAGES)).toBeNull();
  });

  it('no mostra res si l’usuari encara no ha sortit del camp ni ha enviat', () => {
    const control = new FormControl('', Validators.required);

    expect(fieldError(control, false, MESSAGES)).toBeNull();
  });

  it('mostra el missatge en sortir del camp o en enviar', () => {
    const control = new FormControl('', Validators.required);
    expect(fieldError(control, true, MESSAGES)).toBe('Obligatori');

    control.markAsTouched();
    expect(fieldError(control, false, MESSAGES)).toBe('Obligatori');
  });

  it('tria el missatge de l’error que té el camp', () => {
    const control = new FormControl('abcdef', Validators.maxLength(3));

    expect(fieldError(control, true, MESSAGES)).toBe('Massa llarg');
  });
});