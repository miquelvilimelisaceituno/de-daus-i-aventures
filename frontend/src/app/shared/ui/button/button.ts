import { Component } from '@angular/core';

/**
 * Botó primari de la Guia d'estil. S'aplica sobre un <button> natiu:
 * <button appButton type="submit">Entrar</button>
 */

@Component({
  imports: [],
  selector: 'button[appButton]',
  styleUrl: './button.scss',
  templateUrl: './button.html',
})
export class Button {}
