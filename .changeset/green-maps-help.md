---
"@tailor-platform/app-shell": patch
---

Fix `DateField` and `DatePicker` interoperability with `Form` and `Field.Root`.

Date controls now participate correctly in label wiring, `onFormSubmit` value collection, and validation for required and out-of-range default values.
