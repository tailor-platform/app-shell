import { NavLink, Outlet } from "react-router";
import { Toaster } from "sonner";
import { useAppShell } from "@/contexts/appshell-context";
import { Button } from "./ui/button";
import { useT } from "@/i18n-labels";
import { useTitleResolver } from "@/hooks/i18n";

export const EmptyOutlet = () => {
  const t = useT();

  return (
    <>
      <p className="astw:font-semibold astw:leading-none astw:tracking-tight">
        {t("welcomeTitle")}
      </p>
      <p className="pt-4">{t("welcomeBody")}</p>
    </>
  );
};

export const AppShellOutlet = () => (
  <>
    <Outlet />
    <Toaster />
  </>
);

export const SettingsWrapper = () => {
  const { configurations } = useAppShell();
  const t = useT();
  const resolveTitle = useTitleResolver();

  return (
    <div className="astw:mx-auto astw:flex-col astw:flex astw:md:flex-row astw:max-w-5xl astw:gap-[10px] astw:w-full">
      <div>
        <nav className="astw:bg-card astw:md:w-xs astw:rounded-md astw:border astw:p-3 astw:shadow-xs">
          <h2 className="astw:text-sm astw:leading-[36px] astw:mb-2 astw:font-bold ">
            {t("settings")}
          </h2>
          <ul className="astw:flex astw:flex-col astw:gap-1">
            {configurations.settingsResources.map((resource) => (
              <li key={resource.path}>
                <NavLink to={`./${resource.path}`}>
                  {({ isActive }) => (
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="astw:w-full astw:justify-start"
                    >
                      {resource.meta.icon}
                      {resolveTitle(resource.meta.title, resource.path)}
                    </Button>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <section className="astw:bg-card astw:flex-1 astw:rounded-md astw:border astw:shadow-xs">
        <Outlet />
      </section>
    </div>
  );
};
