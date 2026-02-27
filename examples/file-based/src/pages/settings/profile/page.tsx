import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { ProfileSettingsPage, UserIcon } from "shared-pages";

const Page = () => {
  return <ProfileSettingsPage />;
};

Page.appShellPageProps = {
  meta: {
    title: "Profile",
    icon: <UserIcon />,
  },
} satisfies AppShellPageProps;

export default Page;
