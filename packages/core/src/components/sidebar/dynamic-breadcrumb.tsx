import { useLocation, useMatch } from "react-router";
import { useAppShellConfig } from "@/contexts/appshell-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../internals/breadcrumb";
import { processPathSegments } from "@/routing/path";
import { useBreadcrumbOverride } from "@/contexts/breadcrumb-context";
import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";

/**
 * Hook to retrieve the current path segments and their corresponding titles.
 */
export const usePathSegments = () => {
  const { configurations } = useAppShellConfig();
  const location = useLocation();

  return processPathSegments(
    location.pathname,
    configurations.basePath,
    configurations.modules,
    configurations.locale,
  );
};

export const DynamicBreadcrumb = () => {
  const { basePath, segments } = usePathSegments();
  const { overrides } = useBreadcrumbOverride();
  const isSettings = useMatch("/:prefix/settings/:suffix");
  const t = useT();

  if (isSettings) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <div className="astw:inline-flex astw:min-w-0 astw:items-center astw:gap-3 astw:last:text-foreground">
            <BreadcrumbItem>
              <BreadcrumbLink to={`/${isSettings.params.prefix}/settings`}>
                {t("settings")}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </div>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Below `md` a trail of three or more segments keeps only the last one (the
  // current page); the ancestors are hidden with a responsive class, so the
  // rule costs no JavaScript at runtime.
  const collapseAncestors = segments.length >= 3;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segmentInfo, index) => {
          const fullPath = basePath ? `/${basePath}/${segmentInfo.path}` : `/${segmentInfo.path}`;
          const title = overrides.get(fullPath) ?? segmentInfo.title;
          const isLast = index === segments.length - 1;
          return (
            <div
              className={cn(
                "astw:inline-flex astw:min-w-0 astw:items-center astw:gap-3 astw:last:text-foreground",
                collapseAncestors && !isLast && "astw:max-md:hidden",
              )}
              key={index}
            >
              <BreadcrumbItem>
                {segmentInfo.clickable ? (
                  <BreadcrumbLink to={segmentInfo.path}>{title}</BreadcrumbLink>
                ) : (
                  // Non-last segments use ariaCurrent={false} to avoid announcing
                  // intermediate items as the current location to screen readers.
                  <BreadcrumbPage ariaCurrent={isLast ? "location" : false}>{title}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
