---
"@tailor-platform/app-shell": minor
---

Add `typeOptions.currencySign` to DataTable money columns, accepting `"standard"` (the default) or `"accounting"`.
For example, `typeOptions: { currency: "USD", currencySign: "accounting", locale: "en-US" }` displays negative amounts as `($12.35)`.
