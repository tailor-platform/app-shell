---
"@tailor-platform/app-shell": patch
---

Fix componentless resources appearing as navigable links in sidebar and command palette

Componentless resources (defined without a `component`) were included as clickable navigation items in both the sidebar and the command palette, leading users to 404 pages when clicked.

- Componentless resources with sub-resources now appear as non-clickable group headers
- Componentless resources without sub-resources are excluded from navigation entirely
- The command palette no longer lists componentless resources as navigable destinations
