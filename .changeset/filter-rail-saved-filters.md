---
"@tailor-platform/app-shell": minor
---

Add saved filters to `FilterRail`. Users can save the filters selected in the rail under a name and apply them again later.

```tsx
const saved = useSavedFilters("products");

<FilterRail.Root control={control} sections={sections}>
  <FilterRail.SavedFilters {...saved} />
  <FilterRail.Sections />
  <FilterRail.SaveFilter {...saved} />
</FilterRail.Root>;
```

`FilterRail.SavedFilters` is a picker (with a dialog to delete), and `FilterRail.SaveFilter` is a pinned "Save filters" footer that appears only when there is something new to save. `useSavedFilters` keeps them in localStorage by default; pass `storage: { load, save }` (either may be async) to keep them elsewhere. A saved filter holds only the rail's own filters.
