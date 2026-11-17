import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { fieldError } from '../../shared/forms/field-error';
import { Button } from '../../shared/ui/button/button';
import { Card } from '../../shared/ui/card/card';
import { Field } from '../../shared/ui/field/field';
import { Profile } from '../auth.model';
import { AuthService } from '../auth.service';

/** Mateixes regles que PATCH /api/me (D44). */
const NAME_MAX = 40;
const AVATAR_MAX = 500;
const HTTP_URL = /^https?:\/\/\S+$/;

@Component({
  imports: [ReactiveFormsModule, Button, Card, Field],
  selector: 'app-profile-page',
  styleUrl: './profile-page.scss',
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX)]],
    avatarUrl: ['', [Validators.pattern(HTTP_URL), Validators.maxLength(AVATAR_MAX)]],
  });

  protected readonly pending = signal(false);
  protected readonly submitted = signal(false);
  protected readonly saved = signal(false);
  protected readonly formError = signal<string | null>(null);
  /** La imatge de l'avatar no s'ha pogut carregar → es mostra la inicial. */
  protected readonly avatarFailed = signal(false);

  constructor() {
    // L'authGuard ja ha esperat la sessió: si l'API ha respost, el perfil hi és.
    this.fill(this.auth.profile());
  }

  protected nameError(): string | null {
    return fieldError(this.form.controls.name, this.submitted(), {
      required: 'El nom és obligatori',
      maxlength: `El nom pot tenir com a màxim ${NAME_MAX} caràcters`,
    });
  }

  protected avatarError(): string | null {
    return fieldError(this.form.controls.avatarUrl, this.submitted(), {
      pattern: 'Ha de ser una adreça que comenci per http:// o https://',
      maxlength: `L’adreça pot tenir com a màxim ${AVATAR_MAX} caràcters`,
    });
  }

  protected initial(profile: Profile): string {
    return profile.name.trim().charAt(0).toUpperCase() || '?';
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.saved.set(false);
    this.formError.set(null);
    // Abans de validar: un camp només d'espais compta com a buit.
    const { name, avatarUrl } = this.form.controls;
    if (name.value.trim() === '') name.setValue('');
    if (avatarUrl.value.trim() === '') avatarUrl.setValue('');
    if (this.form.invalid || this.pending()) return;

    this.pending.set(true);
    try {
      const profile = await this.auth.updateProfile({
        name: name.value.trim(),
        // Camp buit → treure l'avatar.
        avatarUrl: avatarUrl.value.trim() || null,
      });
      this.fill(profile);
      this.avatarFailed.set(false);
      this.saved.set(true);
    } catch {
      this.formError.set('No s’han pogut desar els canvis. Torna-ho a provar');
    } finally {
      this.pending.set(false);
    }
  }

  protected async retry(): Promise<void> {
    await this.auth.reloadProfile();
    this.fill(this.auth.profile());
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }

  private fill(profile: Profile | null): void {
    if (!profile) return;
    this.form.setValue({ name: profile.name, avatarUrl: profile.avatarUrl ?? '' });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted.set(false);
  }
}
