import type { ReactNode } from "react";

/**
 * Leading visual for a sidebar menu button. When `icon` is omitted, the icon
 * rail (which hides the label) shows the title's first letter instead, so the
 * button never collapses to an empty square. Outside the rail it renders nothing.
 */
export const SidebarButtonIcon = ({ icon, title }: { icon?: ReactNode; title: string }) => {
  if (icon) return <>{icon}</>;
  const initial = Array.from(title.trim())[0]?.toUpperCase();
  if (!initial) return null;
  return (
    <span
      aria-hidden="true"
      data-slot="sidebar-icon-fallback"
      className="astw:hidden astw:size-4 astw:shrink-0 astw:items-center astw:justify-center astw:rounded-[4px] astw:border-[1.5px] astw:border-current astw:text-[9px] astw:leading-none astw:font-semibold astw:group-data-[collapsible=icon]:flex"
    >
      {initial}
    </span>
  );
};
