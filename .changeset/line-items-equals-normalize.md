---
"@tailor-platform/app-shell": minor
---

LineItems: per-field `equals?` and `normalize?` hooks on `LineItemsField`.

App-supplied callbacks let consumers override dirty-equality and value coercion for fields the component can't normalize on its own — e.g. id-based equality on attribute objects (`equals: (a, b) => a.id === b.id`), deep-equal on JSON blobs, currency-aware money comparison, custom rounding rules. The built-in tolerance-aware numeric equality and string trim still apply when the field doesn't supply its own.

Resolution order: field-level `equals` / `normalize` win over `kind: "custom"` type-level `equals` / `normalize`, which win over the built-in numeric defaults.
