import { useLocation, useMatch } from "react-router";
import { useAppShellConfig } from "@/contexts/appshell-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/breadcrumb";
import { processPathSegments } from "@/routing/path";
import { useT } from "@/i18n-labels";

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
  const { segments } = usePathSegments();
  const isSettings = useMatch("/:prefix/settings/:suffix");
  const t = useT();

  if (isSettings) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <div className="astw:inline-flex astw:items-center astw:gap-3 astw:last:text-foreground">
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

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segmentInfo, index) => (
          <div
            className="astw:inline-flex astw:items-center astw:gap-3 astw:last:text-foreground"
            key={index}
          >
            <BreadcrumbItem>
              <BreadcrumbLink to={segmentInfo.path}>
                {segmentInfo.title}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {index < segments.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
