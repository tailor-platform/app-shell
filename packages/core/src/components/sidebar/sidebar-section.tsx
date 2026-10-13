import { type ReactNode, useId } from "react";
import { SidebarGroupLabel } from "./primitives";
import { useAppShellConfig } from "@/contexts/appshell-context";
import { buildLocaleResolver, type LocalizedString } from "@/lib/i18n";

export type SidebarSectionProps = {
  /**
   * Section heading (i18n supported).
   */
  title: LocalizedString;

  /**
   * Child items (SidebarItem, SidebarGroup, etc.)
   */
  children: ReactNode;
};

/**
 * A static heading for a run of flat sidebar navigation items.
 *
 * Unlike `SidebarGroup`, a section is neither collapsible nor navigable, and its
 * items keep the same styling and indentation as top-level items. In the icon
 * rail the heading is hidden so the compact layout is unaffected. Add dividers
 * between sections with `SidebarSeparator`.
 *
 * @example
 * ```tsx
 * <DefaultSidebar>
 *   <SidebarItem to="/overview" />
 *   <SidebarSeparator />
 *   <SidebarSection title={labels.t("services")}>
 *     <SidebarItem to="/ai-gateways" />
 *     <SidebarItem to="/applications" />
 *   </SidebarSection>
 * </DefaultSidebar>
 * ```
 */
export const SidebarSection = (props: SidebarSectionProps) => {
  const { title, children } = props;
  const { configurations } = useAppShellConfig();
  const resolve = buildLocaleResolver(configurations.locale);
  const headingId = useId();

  const resolvedTitle = resolve(title, typeof title === "string" ? title : "");

  // Rendered as an item of the parent `SidebarMenu`, holding its own flat list
  // so children sit at the same level as top-level items (no `SidebarMenuSub`).
  return (
    <li data-slot="sidebar-section" className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1">
      {/* In the icon rail the label collapses (opacity 0, pulled up by its own
          height); pull up one extra `gap-1` so no blank row is left behind. */}
      <SidebarGroupLabel
        id={headingId}
        data-slot="sidebar-section-title"
        className="astw:group-data-[collapsible=icon]:-mt-9"
      >
        {resolvedTitle}
      </SidebarGroupLabel>
      <ul
        aria-labelledby={headingId}
        className="astw:flex astw:w-full astw:min-w-0 astw:flex-col astw:gap-1"
      >
        {children}
      </ul>
    </li>
  );
};
