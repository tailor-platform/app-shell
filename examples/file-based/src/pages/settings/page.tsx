import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { UserIcon } from "shared-pages";

const SettingsPage = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Settings
      </h1>
      <p style={{ color: "hsl(var(--muted-foreground))" }}>
        Configure your application preferences.
      </p>
    </div>
  );
};

SettingsPage.appShellPageProps = {
  meta: {
    title: "Settings",
    icon: <UserIcon />,
  },
} satisfies AppShellPageProps;

export default SettingsPage;
