import { AbstractControl } from '@angular/forms';

/**
 * Missatge d'error d'un camp, o null si no n'ha de mostrar cap.
 * Els errors només es veuen quan l'usuari ha sortit del camp o ha intentat enviar.
 * `messages` relaciona cada error de validació amb el seu missatge, per ordre de prioritat:
 *   fieldError(control, submitted(), { required: 'El nom és obligatori', maxlength: '...' })
 */
export function fieldError(
  control: AbstractControl,
  submitted: boolean,
  messages: Record<string, string>,
): string | null {
  if (control.valid || !(control.touched || submitted)) return null;
  const key = Object.keys(messages).find((error) => control.hasError(error));
  return key ? messages[key] : null;
}