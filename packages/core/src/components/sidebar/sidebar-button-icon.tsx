import type { ReactNode } from "react";

/**
 * Leading visual for a sidebar menu button. When `icon` is omitted, the icon
 * rail (which hides the label) shows the title's first letter instead, so the
 * button never collapses to an empty square. Outside the rail it renders nothing.
 *
 * Drawn as an SVG on lucide's 24px grid (square outline, 2px stroke) so it sizes
 * and strokes like the surrounding icons rather than as text.
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
      stroke="currentColor"
      strokeWidth="2"
      className="astw:hidden astw:group-data-[collapsible=icon]:block"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <text
        x="12"
        y="12.5"
        fill="currentColor"
        stroke="none"
        fontSize="12"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {initial}
      </text>
    </svg>
  );
};
