import { Component, input } from '@angular/core';

/**
 * Botó primari de la Guia d'estil. S'aplica sobre un <button> natiu o sobre un enllaç que porta a una altra pàgina i s'ha de veure com un botó:
 * <button appButton type="submit">Entrar</button>
 * <button appButton variant="secundari" type="button">Tanca la sessió</button>
 * <a appButton routerLink="nova">Nova entitat</a>
 */

@Component({
  imports: [],
  selector: 'button[appButton], a[appButton]',
  styleUrl: './button.scss',
  templateUrl: './button.html',
  host: { '[class.secundari]': "variant() === 'secundari'" },
})
export class Button {
  readonly variant = input<'primari' | 'secundari'>('primari');
}
