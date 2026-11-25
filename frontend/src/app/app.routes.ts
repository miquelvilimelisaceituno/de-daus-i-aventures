import { Routes } from '@angular/router';
import { authGuard } from './auth/auth-guard';
import { guestGuard } from './auth/guest-guard';
import { campaignMemberGuard } from './campaigns/campaign-member-guard';
import { masterGuard } from './campaigns/master-guard';

const comingSoon = () => import('./shared/ui/coming-soon/coming-soon').then((m) => m.ComingSoon);

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
  { 
    path: 'campanyes',
    loadComponent: () => import('./campaigns/campaigns-page/campaigns-page').then((m) => m.CampaignsPage),
    canActivate: [authGuard], 
  },
  {
    path: 'perfil',
    loadComponent: () => import('./auth/profile-page/profile-page').then((m) => m.ProfilePage),
    canActivate: [authGuard],
  },
  // Dins d'una campanya (només membres actius). Les seccions encara sense pàgina fan servir ComingSoon.
  {
    path: 'c/:id',
    canActivate: [authGuard, campaignMemberGuard],
    loadComponent: () => import('./campaigns/campaign-shell/campaign-shell').then((m) => m.CampaignShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./campaigns/campaign-home/campaign-home').then((m) => m.CampaignHome),
      },
      // Compendi (F3). «nova» va abans de «:entityId»: si no, es prendria per un id.
      {
        path: 'compendi',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./compendium/compendium-page/compendium-page').then((m) => m.CompendiumPage),
          },
          {
            path: 'nova',
            loadComponent: () =>
              import('./compendium/entity-form-page/entity-form-page').then((m) => m.EntityFormPage),
            canActivate: [masterGuard],
          },
          {
            path: ':entityId',
            loadComponent: () => import('./compendium/entity-page/entity-page').then((m) => m.EntityPage),
          },
          {
            path: ':entityId/editar',
            loadComponent: () =>
              import('./compendium/entity-form-page/entity-form-page').then((m) => m.EntityFormPage),
            canActivate: [masterGuard],
          },
        ],
      },
      { path: 'calendari', loadComponent: comingSoon, data: { title: 'Calendari' } },
      { path: 'mapa', loadComponent: comingSoon, data: { title: 'Mapa' } },
      {
        path: 'config',
        loadComponent: () => import('./campaigns/campaign-config/campaign-config').then((m) => m.CampaignConfig),
        canActivate: [masterGuard],
      },
    ],
  },
];