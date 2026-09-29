import { type AppShellPageProps } from "@tailor-platform/app-shell";
import { ZodRHFFormDemoPage } from "../../../../showcase/form-demo";

const Page = () => <ZodRHFFormDemoPage />;

Page.appShellPageProps = {
  meta: {
    title: "Zod + RHF Form Demo",
  },
} satisfies AppShellPageProps;

export default Page;
