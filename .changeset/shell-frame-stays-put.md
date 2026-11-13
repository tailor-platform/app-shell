---
"@tailor-platform/app-shell": patch
---

The shell no longer shifts when a page jumps to an anchor, calls `scrollIntoView` or focuses a field below the fold. On long forms, the hidden inputs inside `Select` and `Combobox` made the shell's outer frame taller than the window, and those jumps scrolled the frame itself, pushing the header out of view. The content scroll area now contains those inputs, and the frame can no longer be scrolled.
