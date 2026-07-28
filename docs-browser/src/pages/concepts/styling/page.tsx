import type { AppShellPageProps } from "@tailor-platform/app-shell";

import { DocPage } from "../../../_lib/DocPage";

const Page = () => <DocPage slug="styling" />;

Page.appShellPageProps = {
  meta: { title: "Styling & Tailwind" },
} satisfies AppShellPageProps;

export default Page;
