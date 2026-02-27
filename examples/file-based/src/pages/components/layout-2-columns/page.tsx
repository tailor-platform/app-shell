import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { TwoColumnLayoutPage } from "shared-pages";

const Page = () => {
  return <TwoColumnLayoutPage />;
};

Page.appShellPageProps = {
  meta: {
    title: "2 Columns",
  },
} satisfies AppShellPageProps;

export default Page;
