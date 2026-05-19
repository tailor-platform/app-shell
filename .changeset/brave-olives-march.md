---
"@tailor-platform/app-shell": patch
---

Fix and improve `DescriptionCard` component:

- Fix relative date formatting producing incorrect output for future dates (negative time diff)
- Add i18n label support for relative date strings
- Use react-router `<Link>` for internal navigation in link and reference fields instead of plain `<a>` tags
