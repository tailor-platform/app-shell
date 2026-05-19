---
"@tailor-platform/app-shell": minor
---

LineItems: new `useLineItems().revert()` method that restores current row state back to the dirty-tracking baseline — discards every uncommitted edit/insert/remove in one shot. Use this for a "Discard changes" button; pair with the existing `reset()` after a successful save (which snaps the baseline forward instead).
