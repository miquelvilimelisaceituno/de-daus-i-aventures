import { FormControl, Validators } from '@angular/forms';
import { fieldError } from './field-error';

const MESSAGES = { required: 'Obligatori', maxlength: 'Massa llarg' };

describe('fieldError', () => {
  it('shows nothing if the field is valid', () => {
    const control = new FormControl('Miquel', Validators.required);
    control.markAsTouched();

    expect(fieldError(control, true, MESSAGES)).toBeNull();
  });

  it('shows nothing until the user has left the field or submitted', () => {
    const control = new FormControl('', Validators.required);

    expect(fieldError(control, false, MESSAGES)).toBeNull();
  });

  it('shows the message on blur or on submit', () => {
    const control = new FormControl('', Validators.required);
    expect(fieldError(control, true, MESSAGES)).toBe('Obligatori');

    control.markAsTouched();
    expect(fieldError(control, false, MESSAGES)).toBe('Obligatori');
  });

  it("picks the message for the field's error", () => {
    const control = new FormControl('abcdef', Validators.maxLength(3));

    expect(fieldError(control, true, MESSAGES)).toBe('Massa llarg');
  });
});