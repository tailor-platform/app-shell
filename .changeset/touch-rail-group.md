---
"@tailor-platform/app-shell": patch
---

On touch devices, tapping a group in the sidebar icon rail now opens its flyout, the same popover a mouse opens on hover, so its pages can be reached. Before, nothing happened: the flyout only opened on hover, and the group's own submenu is hidden at icon width. The flyout closes on a second tap, a tap outside, `Escape`, or when a page in it is opened, and only one group's flyout is open at a time. On a touch device, a group with its own page is a button in the rail; its page is linked from the flyout heading instead. Opening the flyout from the keyboard moves focus into it, and closing it returns focus to the icon. The flyout is now built on Base UI `Popover`, which also keeps it on screen next to its icon. Devices with a mouse keep the hover behaviour. Sidebar item tooltips are now disabled, rather than hidden, outside the icon rail, and `Tooltip.Root` accepts Base UI's `disabled` prop.
