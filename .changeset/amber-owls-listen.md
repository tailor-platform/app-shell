---
"@tailor-platform/app-shell": patch
---

The 1.15.0 release notes were amended. Its `@base-ui/react` update from 1.6.0 to 1.8.0 changed two behaviours that can break consumer tests:

- `Select` no longer renders its options into the DOM until it is opened. Open it before asserting option text.
- Opening a `Dialog` or `AlertDialog` applies a scroll lock that can move a button under a Playwright click. Press dialog buttons with `locator.press("Enter")` instead of `click()`.

See the [1.15.0 migration entry](https://github.com/tailor-platform/app-shell/blob/main/docs/migrations.md#1150-base-ui-180-breaks-closed-select-and-dialog-click-tests).
