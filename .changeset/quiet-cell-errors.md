---
"@tailor-platform/app-shell": minor
---

Show cell-local error popovers by default when DataTable editing callbacks throw or return a rejected Promise. Keep pending and failed drafts editable, wait for a successful `onValueChange` check before confirmation, and clear drafts only after confirmation succeeds; Esc or Revert edit discards the draft and error together without trapping cell navigation.
Customize the popover body with `edit.error.render({ row, error })`, or set `edit.error: false` to retain eager edit completion without callback interception. Data adoption, persistence, and rollback remain consumer-owned.
