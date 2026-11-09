import type { ReactNode } from "react";

/**
 * Leading visual for a sidebar menu button. When `icon` is omitted, the icon
 * rail (which hides the label) shows the title's first letter instead, so the
 * button never collapses to an empty square. Outside the rail it renders nothing.
 *
 * Drawn as a 22px SVG (a little larger than the 16px icons, pulled back by a
 * negative margin so the button keeps its size) with a 0.5px hairline frame at
 * 20% of the text color. The frame stays quiet so the character carries the
 * item, which keeps dense CJK glyphs legible.
 */
export const SidebarButtonIcon = ({ icon, title }: { icon?: ReactNode; title: string }) => {
  if (icon) return <>{icon}</>;
  const initial = Array.from(title.trim())[0]?.toUpperCase();
  if (!initial) return null;
  return (
    <svg
      aria-hidden="true"
      data-slot="sidebar-icon-fallback"
      viewBox="0 0 24 24"
      fill="none"
      className="astw:hidden astw:size-5.5! astw:-m-0.75 astw:group-data-[collapsible=icon]:block"
    >
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="23"
        rx="4"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x="12"
        y="12.5"
        fill="currentColor"
        fontSize="16"
        fontWeight="500"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {initial}
      </text>
    </svg>
  );
};
