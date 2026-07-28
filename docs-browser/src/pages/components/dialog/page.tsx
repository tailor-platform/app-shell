import type { AppShellPageProps } from "@tailor-platform/app-shell";

import { DocPage } from "../../../_lib/DocPage";

const Page = () => <DocPage slug="dialog" />;

Page.appShellPageProps = {
  meta: { title: "Dialog" },
} satisfies AppShellPageProps;

export default Page;
