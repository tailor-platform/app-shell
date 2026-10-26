---
"@tailor-platform/app-shell": patch
---

Prevent IME confirmation Enter from applying DataTable filters or closing their value editors mid-input.
Use consistent IME detection, including the keyCode 229 fallback, in filters, cell editors, the command palette, and AI chat.
