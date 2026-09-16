import packageJson from "../../../../package.json";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { useAppShellConfig, type AppInfoEntry } from "@/contexts/appshell-context";
import { useOverrideBreadcrumb } from "@/hooks/use-override-breadcrumb";
import { useT } from "@/i18n-labels";
import type { NavigatableRoute } from "@/routing/path";

export const APP_INFO_SLUG = "__appinfo";
export const APP_INFO_PATH = `/${APP_INFO_SLUG}`;

const APP_SHELL_VERSION = packageJson.version;

const renderValue = (value: AppInfoEntry["value"]) => {
  if (value === null || value === undefined) return "-";
  return String(value);
};

const formatRowsForClipboard = (rows: AppInfoEntry[]) =>
  rows.map((row) => `${row.label}: ${renderValue(row.value)}`).join("\n");

const AppInfoRow = ({ label, value }: AppInfoEntry) => (
  <div className="astw:grid astw:gap-1 astw:py-3 astw:sm:grid-cols-[12rem_minmax(0,1fr)] astw:sm:gap-4">
    <dt className="astw:text-sm astw:text-muted-foreground">{label}</dt>
    <dd className="astw:min-w-0 astw:text-sm astw:break-all">{renderValue(value)}</dd>
  </div>
);

export const useAppInfoPageRoute = (): NavigatableRoute => {
  const t = useT();

  return {
    path: APP_INFO_PATH,
    title: t("appInfoTitle"),
    breadcrumb: [t("appInfoTitle")],
  };
};

export const AppInfoPage = () => {
  const t = useT();
  const { title, appInfo } = useAppShellConfig();

  useOverrideBreadcrumb(t("appInfoTitle"));

  const rows: AppInfoEntry[] = [
    ...(title ? [{ label: t("appInfoAppName"), value: title }] : []),
    { label: t("appInfoAppShellVersion"), value: APP_SHELL_VERSION },
    ...(appInfo?.metadata ?? []),
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatRowsForClipboard(rows));
    } catch {
      // Silently fail if clipboard access is denied.
    }
  };

  return (
    <div className="astw:w-full astw:max-w-xl">
      <Card.Root>
        <div className="astw:flex astw:items-center astw:justify-between astw:px-6 astw:pt-6 astw:pb-4">
          <h1 className="astw:text-lg astw:font-semibold astw:leading-none">{t("appInfoTitle")}</h1>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {t("appInfoCopy")}
          </Button>
        </div>
        <Card.Content>
          <dl>
            {rows.map((row, index) => (
              <div
                key={`${row.label}-${index}`}
                className={index > 0 ? "astw:border-t astw:border-border" : undefined}
              >
                <AppInfoRow {...row} />
              </div>
            ))}
          </dl>
        </Card.Content>
      </Card.Root>
    </div>
  );
};
