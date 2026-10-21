export function isComposing(event: KeyboardEvent, composing = false): boolean {
  // Some browsers end composition before keydown; keyCode 229 still identifies the IME event.
  return event.isComposing || composing || event.keyCode === 229;
}
