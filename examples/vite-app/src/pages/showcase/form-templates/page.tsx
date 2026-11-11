import { type AppShellPageProps } from "@tailor-platform/app-shell";
import { FormTemplatesOverview } from "./overview";

const Page = () => <FormTemplatesOverview />;

Page.appShellPageProps = {
  meta: {
    title: "Form Templates",
  },
} satisfies AppShellPageProps;

export default Page;
