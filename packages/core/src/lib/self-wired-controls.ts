// Registry of controls that draw their own frame and connect to `Field.Root`
// themselves. Each control registers in its own definition, so a new
// form control copies the call from its neighbours. `Field.Control` reads it to
// warn when one is passed to `render` (platform-planning#1977).
const selfWired = new WeakMap<object, string>();

/**
 * Returns `component`, so the call wraps the definition and stays removable:
 * `const X = /* @__PURE__ *\/ markSelfWired(XImpl, "X")`. A bare top-level
 * call would keep every control in a bundle that only imports `Field`.
 */
export function markSelfWired<T extends object>(component: T, name: string): T {
  selfWired.set(component, name);
  return component;
}

export function getSelfWiredName(type: unknown): string | undefined {
  return typeof type === "function" || (typeof type === "object" && type !== null)
    ? selfWired.get(type)
    : undefined;
}
