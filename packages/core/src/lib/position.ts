/**
 * Shared positioning props for components that wrap both a Base UI Popup and
 * Positioner internally (e.g. Menu.Content, Tooltip.Content).
 *
 * Grouping Positioner-specific props under a `position` namespace prevents
 * name collisions with the Popup's own props and keeps the type surface clean.
 *
 * @internal — not exported from the public API.
 */
export interface PositionProps {
  /** Which side of the anchor element to position against. */
  side?: "top" | "right" | "bottom" | "left";
  /** How to align the popup relative to the anchor along the cross axis. */
  align?: "start" | "center" | "end";
  /** Distance (in px) between the popup and the anchor edge. */
  sideOffset?: number;
}
