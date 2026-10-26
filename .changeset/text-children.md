---
"@tailor-platform/app-shell": patch
---

`Text` passes `children` only when you give them. A `render` element that supplies its own content now keeps it, for example `<Text variant="label-md" render={<Field.Error />} />` shows the validation message.
