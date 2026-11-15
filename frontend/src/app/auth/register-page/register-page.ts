import { Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../shared/ui/button/button';
import { Field } from '../../shared/ui/field/field';
import { authErrorMessage } from '../auth-errors';
import { AuthService } from '../auth.service';
import { safeReturnUrl } from '../return-url';

/** Mateixes regles que l'API (nom: 1–40 caràcters, D44) i que Firebase (contrasenya: 6 com a mínim). */
const NAME_MAX = 40;
const PASSWORD_MIN = 6;

@Component({
  imports: [ReactiveFormsModule, RouterLink, Button, Field],
  selector: 'app-register-page',
  styleUrl: './register-page.scss',
  templateUrl: './register-page.html',
})
export class RegisterPage {
    private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN)]],
  });

  protected readonly pending = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected nameError(): string | null {
    const control = this.form.controls.name;
    if (!this.showErrors(control)) return null;
    if (control.hasError('required')) return 'El nom és obligatori';
    if (control.hasError('maxlength')) return `El nom pot tenir com a màxim ${NAME_MAX} caràcters`;
    return null;
  }

  protected emailError(): string | null {
    const control = this.form.controls.email;
    if (!this.showErrors(control)) return null;
    if (control.hasError('required')) return 'L’email és obligatori';
    if (control.hasError('email')) return 'L’email no té un format vàlid';
    return null;
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;
    if (!this.showErrors(control)) return null;
    if (control.hasError('required')) return 'La contrasenya és obligatòria';
    if (control.hasError('minlength')) {
      return `La contrasenya ha de tenir almenys ${PASSWORD_MIN} caràcters`;
    }
    return null;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.formError.set(null);
    // Un nom només d'espais passaria «required»: es comprova després de treure'ls.
    const name = this.form.controls.name;
    if (name.value.trim() === '') name.setValue('');
    if (this.form.invalid || this.pending()) return;

    const { email, password } = this.form.getRawValue();
    this.pending.set(true);
    try {
      await this.auth.register(name.value, email, password);
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (err) {
      this.formError.set(authErrorMessage(err));
    } finally {
      this.pending.set(false);
    }
  }

  private showErrors(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }
}
