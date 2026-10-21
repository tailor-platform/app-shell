// Registry of controls that draw their own frame and connect to `Field.Root`
// themselves. Each control registers next to its own definition, so a new
// form control copies the call from its neighbours. `Field.Control` reads it to
// warn when one is passed to `render` (platform-planning#1977).
const selfWired = new WeakMap<object, string>();

export function markSelfWired(component: object, name: string) {
  selfWired.set(component, name);
}

export function getSelfWiredName(type: unknown): string | undefined {
  return typeof type === "function" || (typeof type === "object" && type !== null)
    ? selfWired.get(type)
    : undefined;
}
