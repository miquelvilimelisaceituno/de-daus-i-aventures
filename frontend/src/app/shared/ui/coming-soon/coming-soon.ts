import { Component, input } from '@angular/core';

/**
 * Pàgina provisional per a les seccions que encara no existeixen (compendi, calendari, mapa…),
 * perquè la barra de la campanya ja es pugui fer servir. El títol arriba de `data` de la ruta.
 */
@Component({
  imports: [],
  selector: 'app-coming-soon',
  styleUrl: './coming-soon.scss',
  templateUrl: './coming-soon.html',
})
export class ComingSoon {
  readonly title = input.required<string>();
}