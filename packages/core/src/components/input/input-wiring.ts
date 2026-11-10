import { createContext, useContext } from "react";

// How an `Input` treats the nearest `Field.Root`:
// - "field": it becomes the field's control (the default).
// - "field-control": `Field.Control` rendered it and already wires the field,
//   so a second control would nest inside the first.
// - "standalone": an AppShell component's own input (a search box, filter or
//   cell editor) that must not take over a field the component sits in.
export type InputWiring = "field" | "field-control" | "standalone";

export const InputWiringContext = createContext<InputWiring>("field");

export function useInputWiring() {
  return useContext(InputWiringContext);
}
