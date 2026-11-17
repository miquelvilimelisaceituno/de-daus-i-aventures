import { AuthGateway, AuthUserInfo } from '../auth-gateway';

/** AuthGateway per als tests: sense Firebase ni xarxa. */
export class FakeAuthGateway implements AuthGateway {
    user: AuthUserInfo | null = null;
  token: string | null = null;
  /** Si té valor, signIn i register el llancen (simula un error de Firebase). */
  failWith: unknown = null;
  readonly calls: string[] = [];
  private listener: ((user: AuthUserInfo | null) => void) | null = null;

  onAuthStateChanged(callback: (user: AuthUserInfo | null) => void): () => void {
    this.listener = callback;
    // Com Firebase: la primera notificació arriba després, no dins de la crida.
    queueMicrotask(() => this.listener?.(this.user));
    return () => (this.listener = null);
  }

  async signIn(email: string): Promise<void> {
    this.calls.push(`signIn:${email}`);
    this.fail();
    this.emit({ uid: 'uid-1', email }, 'token-1');
  }

  async register(email: string): Promise<void> {
    this.calls.push(`register:${email}`);
    this.fail();
    this.emit({ uid: 'uid-1', email }, 'token-1');
  }

  async signOut(): Promise<void> {
    this.calls.push('signOut');
    this.emit(null, null);
  }

  async getIdToken(): Promise<string | null> {
    return this.token;
  }

  /** Simula que Firebase notifica un canvi d'usuari. */
  emit(user: AuthUserInfo | null, token: string | null = null): void {
    this.user = user;
    this.token = token;
    this.listener?.(user);
  }

  private fail(): void {
    if (this.failWith) throw this.failWith;
  }
}
