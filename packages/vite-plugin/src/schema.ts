import { s } from "./validator";

/**
 * Schema definition for appShellPageProps.
 *
 * This schema is used by the Vite plugin to validate
 * the structure of appShellPageProps at build time.
 *
 * @example
 * ```tsx
 * // Valid appShellPageProps
 * DashboardPage.appShellPageProps = {
 *   meta: { title: "Dashboard", icon: <DashboardIcon /> },
 *   guards: [authGuard],
 *   loader: async () => ({ data: "..." }),
 * } satisfies AppShellPageProps;
 * ```
 */
export const appShellPagePropsSchema = s.object({
  /**
   * Metadata for the page used in navigation and breadcrumbs.
   */
  meta: s
    .object({
      /**
       * Title of the page displayed in navigation and breadcrumbs.
       * Supports localized strings with translations.
       */
      title: s.any(),
      /**
       * Icon displayed alongside the title in navigation.
       */
      icon: s.any(),
    })
    .optional(),

  /**
   * Guards to control access to this page.
   * Guards are executed in order. Each page evaluates only its own guards (no inheritance from parent pages).
   */
  guards: s.array(s.any()).optional(),

  /**
   * Loader function to fetch data before rendering the page.
   */
  loader: s.any().optional(),
});
