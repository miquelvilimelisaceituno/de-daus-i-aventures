import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { authInterceptor } from './auth/auth-interceptor';
import { AuthService } from './auth/auth.service';
import { provideFirebaseAuth } from './auth/firebase-auth-gateway';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideFirebaseAuth(),
    // Crea l'AuthService en arrencar: escolta Firebase i sincronitza el perfil des del primer moment.
    provideAppInitializer(() => void inject(AuthService)),
  ],
};
