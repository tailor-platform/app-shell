---
"@tailor-platform/app-shell": patch
---

Button `outline` now has a transparent background (like Input) instead of `--background`, and no shadow, so it no longer shows up as a slightly gray fill on white surfaces such as `Card`. The `cream` and `bloom` themes no longer need their own transparent override for outline buttons, so those rules are removed.

Tabs `capsule` uses a translucent black track (`bg-black/5`) instead of `--background`, and the active capsule tab uses `--card` (white in light mode, a slightly lighter `bg-input/60` in dark mode) instead of a tinted `bg-primary/10`, so it no longer follows the theme colour.
