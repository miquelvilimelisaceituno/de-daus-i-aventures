import { Routes } from '@angular/router';
import { CampaignsPage } from './campaigns/campaigns-page/campaigns-page';
import { LoginPage } from './auth/login-page/login-page';
import { RegisterPage } from './auth/register-page/register-page';
import { authGuard } from './auth/auth-guard';
import { guestGuard } from './auth/guest-guard';


export const routes: Routes = [
    { path: '', redirectTo: 'campanyes', pathMatch: 'full' },
    // Només per a qui no ha iniciat sessió
    { path: 'login', component: LoginPage, canActivate: [guestGuard]},
    { path: 'register', component: RegisterPage, canActivate: [guestGuard]},
    // Privades
    { path: 'campanyes', component: CampaignsPage, canActivate: [authGuard]  },
];
