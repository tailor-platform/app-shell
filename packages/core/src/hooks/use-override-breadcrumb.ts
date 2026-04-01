import { useEffect } from "react";
import { useLocation } from "react-router";
import { useBreadcrumbOverride } from "@/contexts/breadcrumb-context";

/**
 * Override the breadcrumb title for the current page.
 *
 * When `title` is a string, the breadcrumb segment matching the current path
 * is replaced with that value. When `title` is `undefined`, any previous
 * override is removed and the default title (from `defineResource`) is used.
 *
 * This hook is designed to work seamlessly with async data fetching — pass
 * the result of a query directly and the breadcrumb will update reactively.
 *
 * @example
 * ```tsx
 * defineResource({
 *   path: ":id",
 *   meta: { breadcrumbTitle: (segment) => `#${segment}` },
 *   component: () => {
 *     const { id } = useParams();
 *     const { data } = useQuery(GET_ORDER, { variables: { id } });
 *     useOverrideBreadcrumb(data?.order?.name);
 *     return <OrderDetail />;
 *   },
 * });
 * ```
 */
export function useOverrideBreadcrumb(title: string | undefined): void {
  const location = useLocation();
  const { register, unregister } = useBreadcrumbOverride();
  const path = location.pathname;

  useEffect(() => {
    if (title) {
      register(path, title);
    } else {
      unregister(path);
    }
    return () => unregister(path);
  }, [path, title, register, unregister]);
}
