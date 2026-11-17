import { Service, inject, computed, DestroyRef, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AUTH_GATEWAY, AuthUserInfo } from './auth-gateway';
import { AuthStatus, Profile } from './auth.model';

@Service()
export class AuthService {
      private readonly gateway = inject(AUTH_GATEWAY);
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/me`;

  private readonly _status = signal<AuthStatus>('loading');
  private readonly _profile = signal<Profile | null>(null);
  private readonly _profileError = signal(false);

  readonly status = this._status.asReadonly();
  /** Perfil de /api/me. Null si no hi ha sessió o si no s'ha pogut carregar. */
  readonly profile = this._profile.asReadonly();
  /** Hi ha sessió de Firebase però l'API no ha retornat el perfil (API caiguda o adormida). */
  readonly profileError = this._profileError.asReadonly();
  readonly isSignedIn = computed(() => this._status() === 'signedIn');

  /** Nom triat al registre: s'envia al POST /api/me que crea el perfil. */
  private pendingName: string | null = null;
  /** uid de l'últim usuari notificat, per descartar respostes d'un usuari anterior. */
  private currentUid: string | null = null;
  private waiters: (() => void)[] = [];

  constructor() {
    const unsubscribe = this.gateway.onAuthStateChanged((user) => void this.handleUser(user));
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  /** Es resol quan l'estat deixa de ser `loading`. Per als guards i després de login o registre. */
  whenSettled(): Promise<void> {
    if (this._status() !== 'loading') return Promise.resolve();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  /** Inicia sessió. Si Firebase la rebutja, llança l'error. */
  async login(email: string, password: string): Promise<void> {
    await this.run(() => this.gateway.signIn(email.trim(), password));
  }

  /** Crea el compte a Firebase i el perfil a l'API amb el nom triat. */
  async register(name: string, email: string, password: string): Promise<void> {
    this.pendingName = name.trim() || null;
    try {
      await this.run(() => this.gateway.register(email.trim(), password));
    } catch (err) {
      this.pendingName = null;
      throw err;
    }
  }

  async logout(): Promise<void> {
    await this.run(() => this.gateway.signOut());
  }

  /** Canvia el nom o l'avatar (PATCH /api/me, HU-03) i actualitza el perfil de tota l'app. */
  async updateProfile(changes: { name?: string; avatarUrl?: string | null }): Promise<Profile> {
    const profile = await firstValueFrom(this.http.patch<Profile>(this.url, changes));
    this._profile.set(profile);
    this._profileError.set(false);
    return profile;
  }
  
  /** Torna a demanar el perfil (per exemple, si l'API estava adormida). */
  async reloadProfile(): Promise<void> {
    if (!this.currentUid) return;
    this.setStatus('loading');
    await this.syncProfile(this.currentUid);
  }

  // Marca `loading` abans de cridar Firebase: així whenSettled() espera que
  // onAuthStateChanged hagi notificat l'usuari nou i s'hagi carregat el perfil.
  private async run(action: () => Promise<void>): Promise<void> {
    const previous = this._status();
    this.setStatus('loading');
    try {
      await action();
    } catch (err) {
      this.setStatus(previous);
      throw err;
    }
    await this.whenSettled();
  }

  private async handleUser(user: AuthUserInfo | null): Promise<void> {
    this.currentUid = user?.uid ?? null;
    if (!user) {
      this._profile.set(null);
      this._profileError.set(false);
      this.setStatus('signedOut');
      return;
    }
    this.setStatus('loading');
    await this.syncProfile(user.uid);
  }

  // POST /api/me és un upsert (D44): crea el perfil al primer login i, després, el retorna igual.
  private async syncProfile(uid: string): Promise<void> {
    const body = this.pendingName ? { name: this.pendingName } : {};
    try {
      const profile = await firstValueFrom(this.http.post<Profile>(this.url, body));
      if (uid !== this.currentUid) return;
      this.pendingName = null;
      this._profile.set(profile);
      this._profileError.set(false);
    } catch {
      if (uid !== this.currentUid) return;
      this._profile.set(null);
      this._profileError.set(true);
    }
    this.setStatus('signedIn');
  }

  private setStatus(status: AuthStatus): void {
    this._status.set(status);
    if (status === 'loading') return;
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve());
  }

}
