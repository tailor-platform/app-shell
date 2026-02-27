import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { OneColumnLayoutPage } from "shared-pages";

const Page = () => {
  return <OneColumnLayoutPage />;
};

Page.appShellPageProps = {
  meta: {
    title: "1 Column",
  },
} satisfies AppShellPageProps;

export default Page;
