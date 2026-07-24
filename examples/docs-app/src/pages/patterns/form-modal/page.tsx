import type { AppShellPageProps } from "@tailor-platform/app-shell";

import { DocPage } from "../../../_lib/DocPage";

const Page = () => <DocPage slug="form-modal" />;

Page.appShellPageProps = {
  meta: { title: "Modal form" },
} satisfies AppShellPageProps;

export default Page;
