import { Routes } from '@angular/router';
import { CampaignsPage } from './campaigns/campaigns-page/campaigns-page';
import { LoginPage } from './auth/login-page/login-page';


export const routes: Routes = [
    { path: '', redirectTo: 'campanyes', pathMatch: 'full' },
    { path: 'campanyes', component: CampaignsPage },
    { path: 'login', component: LoginPage },
];
