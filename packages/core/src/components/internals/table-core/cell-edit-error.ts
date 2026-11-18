/**
 * A cell-editing failure whose message is safe to display to the user.
 * Translate the message before throwing; other errors use generic feedback.
 */
export class CellEditError extends globalThis.Error {
  override name = "CellEditError";
}
