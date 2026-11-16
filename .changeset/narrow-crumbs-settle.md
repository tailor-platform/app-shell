---
"@tailor-platform/app-shell": patch
---

Keep the header breadcrumb readable on phones. Below the `md` breakpoint (768px) `GlobalHeaderLayout.DefaultHeader` hides the app title and its divider, and the route breadcrumb (both layouts) shows only the current page when the trail is three or more segments deep.
The breadcrumb no longer wraps onto extra lines: a long page title truncates with an ellipsis, and each link is 24px tall so it meets the WCAG 2.5.8 target size.
