import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { WizardPage } from "../wizard-template";

const Page = () => <WizardPage />;

Page.appShellPageProps = {
  meta: {
    title: "Wizard Form",
  },
} satisfies AppShellPageProps;

export default Page;
