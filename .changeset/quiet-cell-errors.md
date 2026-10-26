---
"@tailor-platform/app-shell": minor
---

Show cell-local error popovers by default when DataTable editing callbacks throw or return a rejected Promise. Keep pending and failed drafts editable, wait for a successful `onValueChange` check before confirmation, and clear drafts only after confirmation succeeds; Esc closes open error details first, then discards the draft and error together without trapping cell navigation.
Throw the exported `CellEditError` with a translated, user-facing message to display its text; other failures use localized generic feedback. Custom renderers still receive the original thrown value.
Each new failure automatically opens its popover without moving focus. Close the details without discarding the failed draft, then reopen them with the error icon or Alt+ArrowDown. The standard popover adds no reset action. Customize its body and any consumer-owned actions with `edit.error.render({ row, error })`, or set `edit.error: false` to retain eager edit completion without callback interception. Data adoption, persistence, and rollback remain consumer-owned.
