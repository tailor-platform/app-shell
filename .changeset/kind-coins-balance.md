---
"@tailor-platform/app-shell": minor
---

Add `typeOptions.currencySign` to DataTable money columns and `meta.currencySign` to DescriptionCard money fields, accepting `"standard"` (the default) or `"accounting"`.
For example, `typeOptions: { currency: "USD", currencySign: "accounting", locale: "en-US" }` displays negative amounts as `($12.35)` in DataTable. Use `meta: { currencySign: "accounting" }` in DescriptionCard for accounting notation in the environment's locale.
