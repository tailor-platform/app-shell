import type { AppShellPageProps } from "@tailor-platform/app-shell";

import { DocPage } from "../../../_lib/DocPage";

const Page = () => <DocPage slug="data-table" />;

Page.appShellPageProps = {
  meta: { title: "DataTable" },
} satisfies AppShellPageProps;

export default Page;
