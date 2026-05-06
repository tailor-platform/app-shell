---
"@tailor-platform/app-shell": minor
---

LineItems: new `LineItemsField.pinned?: "left" | "right"` per-field option.

Pinned columns stay visible while the user scrolls horizontally — `position: sticky` with offsets accumulated from preceding pinned columns of the same side. Useful for dense tables where the SKU / Product columns should stay anchored as the user scrolls through 8+ data columns.

Pinned columns must declare a `width` so subsequent offsets can be computed. The selection checkbox column (`__select`) is auto-pinned to the left when present.

Demo: `/custom-page/goods-receipt-demo` pins SKU + Product on the left while horizontal-scrolling Condition / Lot / Expiry.
