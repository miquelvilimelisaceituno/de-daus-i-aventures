import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

/** Capçalera de l'app: logo DA (D24) i, amb sessió, l'accés al perfil. */
@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  protected readonly auth = inject(AuthService);
}
