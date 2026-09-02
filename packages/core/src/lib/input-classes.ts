/**
 * Shared base Tailwind classes for text-input-like controls.
 *
 * `controlBaseClasses` holds everything the controls agree on — border, focus
 * ring, placeholder, disabled treatment. Each control appends its own sizing
 * because a single-line input and a textarea disagree on height and padding.
 *
 * `inputBaseClasses` is used by both `Input` and `Field.Control`;
 * `textareaBaseClasses` by `Textarea`. Each consumer layers on
 * context-specific classes (e.g. `aria-invalid` vs `data-invalid`, file-input
 * utilities).
 */
const controlBaseClasses = [
  "astw:border-input astw:flex astw:w-full astw:min-w-0 astw:rounded-md astw:border astw:bg-transparent astw:px-3 astw:text-base astw:shadow-xs astw:outline-none astw:md:text-sm",
  "astw:dark:bg-input/30 astw:transition-[color,box-shadow]",
  "astw:selection:bg-primary astw:selection:text-primary-foreground",
  "astw:placeholder:text-muted-foreground",
  "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
  "astw:disabled:pointer-events-none astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
] as const;

export const inputBaseClasses = [...controlBaseClasses, "astw:h-9 astw:py-1"] as const;

/**
 * Textarea sizing: no fixed height. `rows` sets the visible line count, with a
 * floor of `min-h-16` so the box never collapses toward the single-line `h-9`,
 * and `resize-y` so the user can drag it taller for a long value.
 *
 * Deliberately NOT `field-sizing-content`: it would auto-grow the box, but the
 * browser then ignores `rows`, leaving height settable only through a
 * `min-h-*` utility. Consumers can't rely on that — `astw:` utilities exist
 * only if they were compiled into this package's CSS, so an arbitrary
 * `astw:min-h-*` from a consuming app resolves to nothing.
 */
export const textareaBaseClasses = [
  ...controlBaseClasses,
  "astw:min-h-16 astw:py-2 astw:resize-y",
] as const;
