import { Component, forwardRef, input, signal, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UniqueIdService } from '../../unique-id.service';  

/**
 * Camp de formulari de la Guia d'estil: etiqueta, input i missatge d'error.
 * Funciona amb formularis reactius:
 * <app-field label="Email" type="email" formControlName="email" [error]="emailError()" />
 */

@Component({
  imports: [],
  selector: 'app-field',
  styleUrl: './field.scss',
  templateUrl: './field.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Field), multi: true }],
})
export class Field implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input('off');
  /** Missatge d'error ja traduït. Null o buit → sense error. */
  readonly error = input<string | null>(null);

  protected readonly id = inject(UniqueIdService).next('camp');
  protected readonly errorId = `${this.id}-error`;
  protected readonly value = signal('');
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  // ControlValueAccessor: com parla el formulari amb aquest component.
  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }
}
