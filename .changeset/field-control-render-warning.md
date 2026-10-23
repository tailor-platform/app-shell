---
"@tailor-platform/app-shell": patch
---

`Field.Control` now logs a console warning when it is given an AppShell control that draws its own frame through `render`, such as `<Field.Control render={<Select />} />`. That composition renders a double border. The warning logs in every build, not only in development, because it only fires for UI that is already broken. `Select`, `Combobox`, `Autocomplete`, `Checkbox`, `Textarea`, `DateField`, `DatePicker`, and `DateRangePicker` go directly under `Field.Root` instead. The Form, Select, and form-modal docs now say which controls go where.
