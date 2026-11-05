import { Routes } from '@angular/router';
import { CampaignsPage } from './campaigns/campaigns-page/campaigns-page';


export const routes: Routes = [
    { path: '', redirectTo: 'campanyes', pathMatch: 'full' },
    { path: 'campanyes', component: CampaignsPage },
];
