import { useLocation, useMatch } from "react-router";
import { useAppShellConfig } from "@/contexts/appshell-context";
import { Breadcrumb } from "@/components/breadcrumb";
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
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <div className="astw:inline-flex astw:items-center astw:gap-3 astw:last:text-foreground">
            <Breadcrumb.Item>
              <Breadcrumb.Link to={`/${isSettings.params.prefix}/settings`}>
                {t("settings")}
              </Breadcrumb.Link>
            </Breadcrumb.Item>
          </div>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    );
  }

  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        {segments.map((segmentInfo, index) => (
          <div
            className="astw:inline-flex astw:items-center astw:gap-3 astw:last:text-foreground"
            key={index}
          >
            <Breadcrumb.Item>
              <Breadcrumb.Link to={segmentInfo.path}>
                {segmentInfo.title}
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            {index < segments.length - 1 && <Breadcrumb.Separator />}
          </div>
        ))}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};
