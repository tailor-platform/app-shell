import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { DescriptionCardDemoPage } from "shared-pages";

const Page = () => {
  return <DescriptionCardDemoPage />;
};

Page.appShellPageProps = {
  meta: {
    title: "Description Card",
  },
} satisfies AppShellPageProps;

export default Page;
