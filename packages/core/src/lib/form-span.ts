/**
 * How many grid columns a field covers inside a `FormLayout`. `"full"` always
 * spans the whole row. A numeric span never exceeds the columns currently
 * shown, so a `span={3}` field in a two-column grid covers both columns.
 *
 * Lives here rather than in `form-layout/` so `Field` and `Fieldset`, which
 * take `span`, don't depend on `FormLayout`.
 */
export type FormSpan = 2 | 3 | "full";
