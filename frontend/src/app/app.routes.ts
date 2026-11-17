import { Routes } from '@angular/router';
import { authGuard } from './auth/auth-guard';
import { guestGuard } from './auth/guest-guard';
import { CampaignsPage } from './campaigns/campaigns-page/campaigns-page';

export const routes: Routes = [
  { path: '', redirectTo: 'campanyes', pathMatch: 'full' },
  // Només per a qui no ha iniciat sessió
  {
    path: 'login',
    loadComponent: () => import('./auth/login-page/login-page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register-page/register-page').then((m) => m.RegisterPage),
    canActivate: [guestGuard],
  },
  // Privades
  { path: 'campanyes', component: CampaignsPage, canActivate: [authGuard] },
  {
    path: 'perfil',
    loadComponent: () => import('./auth/profile-page/profile-page').then((m) => m.ProfilePage),
    canActivate: [authGuard],
  },
];