import { createContext, useContext } from "react";

// True inside the element `Field.Control` renders. `Input` reads it so that
// `<Field.Control render={<Input />} />` keeps one control instead of nesting a
// second `Field.Control` inside the first.
export const InsideFieldControlContext = createContext(false);

export function useInsideFieldControl() {
  return useContext(InsideFieldControlContext);
}
