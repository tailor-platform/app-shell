import type { AppShellPageProps } from "@tailor-platform/app-shell";

import { DocPage } from "../../../_lib/DocPage";

const Page = () => <DocPage slug="list-dense-scan" />;

Page.appShellPageProps = {
  meta: { title: "Dense scan list" },
} satisfies AppShellPageProps;

export default Page;
