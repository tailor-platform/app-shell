---
"@tailor-platform/app-shell": patch
---

The `Select` list now stays inside the viewport. When it opens below or above the trigger, it is at most 15rem tall, scrolls when there are more options, and opens on the side with more room. Before, a `Select` near the bottom of the screen opened a list whose last options were off screen and could not be scrolled to or clicked.

If you added a global CSS override on `[data-slot="select-content"]` to work around this, you can remove it.
