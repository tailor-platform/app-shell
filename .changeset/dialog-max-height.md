---
"@tailor-platform/app-shell": patch
---

`Dialog.Content` now stays inside the viewport. Its height is capped at the viewport height minus 2rem, and it scrolls when the content is taller. Before, a tall dialog ran off the top and bottom of the screen, and its title, close button and footer could not be reached.

Because the dialog is now a scroll container, content wider than the dialog no longer spills past its edge. It scrolls sideways inside the dialog instead.
