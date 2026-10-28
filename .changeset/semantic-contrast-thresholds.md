---
"@tailor-platform/app-shell": patch
---

Document the contrast thresholds for the semantic colour roles: 4.5:1 for text and 3:1 for non-text. The styling guide now states that the hue roles have the same values in every shipped palette, and lists the known exceptions: hover text, status content directly on the `bloom` light shell gradient, and the `warning` solid and indicator against a light card. The contrast test now checks the `cream` and `bloom` palettes as well as `default`. No colour values change.
