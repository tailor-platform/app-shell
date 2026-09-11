import { type AppShellPageProps } from "@tailor-platform/app-shell";
import { FormComponentsDemoPage } from "../../../showcase/form-demo";

const Page = () => <FormComponentsDemoPage />;

Page.appShellPageProps = {
  meta: {
    title: "Form Components Demo",
  },
} satisfies AppShellPageProps;

export default Page;
