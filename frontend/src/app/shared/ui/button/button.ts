import { Component, input } from '@angular/core';

/**
 * Botó primari de la Guia d'estil. S'aplica sobre un <button> natiu:
 * <button appButton type="submit">Entrar</button>
 * <button appButton variant="secundari" type="button">Tanca la sessió</button>
 */

@Component({
  imports: [],
  selector: 'button[appButton]',
  styleUrl: './button.scss',
  templateUrl: './button.html',
  host: { '[class.secundari]': "variant() === 'secundari'" },
})
export class Button {
  readonly variant = input<'primari' | 'secundari'>('primari');
}
