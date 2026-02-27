import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { ThreeColumnLayoutPage } from "shared-pages";

const Page = () => {
  return <ThreeColumnLayoutPage />;
};

Page.appShellPageProps = {
  meta: {
    title: "3 Columns",
  },
} satisfies AppShellPageProps;

export default Page;
