import { type AppShellPageProps } from "@tailor-platform/app-shell";
import { Sigma } from "lucide-react";
import { ZodRHFFormDemoPage } from "../../../../showcase/form-demo";

const Page = () => <ZodRHFFormDemoPage />;

Page.appShellPageProps = {
  meta: {
    title: "Zod + RHF Form Demo",
    icon: <Sigma size={16} />,
  },
} satisfies AppShellPageProps;

export default Page;
