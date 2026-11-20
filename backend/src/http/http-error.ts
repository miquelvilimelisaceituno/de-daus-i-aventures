/**
 * Error amb el codi HTTP que ha de rebre el client.
 * Es pot llançar des de qualsevol lloc (ruta o funció de negoci): el gestor d'errors
 * d'app.ts el converteix en { error: message } amb aquest codi.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}