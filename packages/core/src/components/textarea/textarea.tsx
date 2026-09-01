import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";

import { cn } from "@/lib/utils";
import { textareaBaseClasses } from "@/lib/input-classes";

// `render` is intentionally excluded: the component owns the `<textarea>` tag
// so the visual and the field wiring stay stable. Every other Base UI
// `Field.Control` prop (`value`, `defaultValue`, `onValueChange`, `disabled`,
// `required`, `readOnly`, `name`, `id`, aria-*, …) is forwarded, plus the
// textarea-only props that `Field.Control`'s `<input>`-shaped types don't
// cover. `onChange` is re-typed against `<textarea>` for the same reason.
//
// `cols` is deliberately absent: the base classes include `w-full`, which
// always beats the width `cols` asks for, so accepting it would be accepting a
// prop that can never do anything. Width is the parent's job.
type TextareaProps = Omit<React.ComponentProps<typeof BaseField.Control>, "render" | "onChange"> &
  Pick<React.ComponentProps<"textarea">, "onChange" | "rows" | "wrap">;

/**
 * A styled multi-line text input.
 *
 * Wraps Base UI's `Field.Control` rendered as a `<textarea>`, so it works with
 * `Field` and React Hook Form the same way `Input`, `Checkbox`, and `Select`
 * do — placed inside a `Field.Root` it inherits label association,
 * `aria-describedby`, `disabled`, and the `data-invalid` error state
 * automatically (no `error` prop of its own). Outside a `Field.Root` it
 * renders as a plain standalone control.
 *
 * The box has no fixed height: `rows` sets the visible line count, and the user
 * can drag it taller. `min-h-16` is a hard floor, so `rows={1}` and `rows={2}`
 * both render at 64px — `rows` only starts moving the height from 3 up.
 *
 * @example
 * ### Standalone
 * ```tsx
 * const [note, setNote] = React.useState("");
 *
 * <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note…" />
 * ```
 *
 * @example
 * ### Taller
 * ```tsx
 * <Textarea rows={8} placeholder="Paste the incident log…" />
 * ```
 *
 * @example
 * ### Inside a Field
 * ```tsx
 * <Field.Root name="description">
 *   <Field.Label>Description</Field.Label>
 *   <Textarea rows={5} placeholder="What changed?" />
 *   <Field.Description>Optional — visible to the whole team.</Field.Description>
 * </Field.Root>
 * ```
 *
 * @example
 * ### With React Hook Form
 * ```tsx
 * <Controller
 *   name="description"
 *   control={control}
 *   rules={{ required: "Description is required." }}
 *   render={({ field, fieldState }) => (
 *     <Field.Root name={field.name} {...fieldState}>
 *       <Field.Label>Description</Field.Label>
 *       <Textarea {...field} rows={5} />
 *       <Field.Error />
 *     </Field.Root>
 *   )}
 * />
 * ```
 */
function Textarea({ className, ...props }: TextareaProps) {
  return (
    <BaseField.Control
      data-slot="textarea"
      render={<textarea />}
      // Styled off BOTH `data-invalid` and `aria-invalid` so the border turns
      // destructive whether the invalid state comes from a Base UI
      // `Field.Root` or from a shadcn-style `aria-invalid` on the control.
      className={cn(
        textareaBaseClasses,
        "astw:data-invalid:border-destructive astw:data-invalid:ring-destructive/20 astw:dark:data-invalid:ring-destructive/40",
        "astw:aria-invalid:border-destructive astw:aria-invalid:ring-destructive/20 astw:dark:aria-invalid:ring-destructive/40",
        className,
      )}
      // `Field.Control`'s props are typed against its default `<input>` tag, so
      // the textarea-shaped `onChange` above doesn't fit them. `render` makes
      // the rendered element a `<textarea>`, so the handler the consumer wrote
      // is the correct one at runtime — only the static types disagree.
      {...(props as React.ComponentProps<typeof BaseField.Control>)}
    />
  );
}

export { Textarea, type TextareaProps };
