import { Input, type InputProps } from "./input";
import { InputWiringContext } from "./input-wiring";

/**
 * `Input` that never connects to a surrounding `Field.Root`. For inputs that
 * are part of another AppShell component, so a `TreePicker` or `DataTable`
 * placed in a field doesn't hand the field its search box. Internal only.
 */
export function StandaloneInput(props: InputProps) {
  return (
    <InputWiringContext.Provider value="standalone">
      <Input {...props} />
    </InputWiringContext.Provider>
  );
}
