/**
 * Shared base Tailwind classes for text-input-like controls.
 *
 * Surfaces use **transparent** fill so the control picks up whatever is behind it
 * (e.g. white `Card`, cream page). In `.dark`, a light input wash applies.
 *
 * Used by both `Input` and `Field.Control`. Select/Combobox/Autocomplete triggers
 * repeat the same transparent + dark line for the same behavior.
 */
export const inputBaseClasses = [
  "astw:border-input astw:flex astw:h-9 astw:w-full astw:min-w-0 astw:rounded-md astw:border astw:px-3 astw:py-1 astw:text-base astw:shadow-xs astw:outline-none astw:md:text-sm",
  "astw:bg-transparent astw:dark:bg-input/30 astw:transition-[color,box-shadow]",
  "astw:selection:bg-primary astw:selection:text-primary-foreground",
  "astw:placeholder:text-muted-foreground",
  "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
  "astw:disabled:pointer-events-none astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
] as const;
