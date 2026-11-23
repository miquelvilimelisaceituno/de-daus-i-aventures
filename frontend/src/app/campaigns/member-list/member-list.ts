import { Component, input, output } from '@angular/core';
import { Button } from '../../shared/ui/button/button';
import { Member, ROLE_LABELS } from '../campaign.model';

/**
 * Llista de membres d'una campanya. Amb `expellable`, cada jugador porta el botó «Expulsa»
 * (el màster mai: no es pot expulsar). Qui la fa servir decideix què passa en clicar-lo.
 */
@Component({
  imports: [Button],
  selector: 'app-member-list',
  styleUrl: './member-list.scss',
  templateUrl: './member-list.html',
})
export class MemberList {
  readonly members = input.required<Member[]>();
  readonly expellable = input(false);
  /** Mentre s'expulsa algú, tots els botons queden desactivats. */
  readonly busy = input(false);
  readonly expel = output<Member>();

  protected readonly roleLabels = ROLE_LABELS;

  protected initial(member: Member): string {
    return member.name.trim().charAt(0).toUpperCase() || '?';
  }
}