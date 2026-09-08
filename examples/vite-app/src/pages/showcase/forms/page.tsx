import { type AppShellPageProps } from "@tailor-platform/app-shell";
import { ClipboardPenLine } from "lucide-react";
import { FormComponentsDemoPage } from "../../../showcase/form-demo";

const Page = () => <FormComponentsDemoPage />;

Page.appShellPageProps = {
  meta: {
    title: "Form Components Demo",
    icon: <ClipboardPenLine size={16} />,
  },
} satisfies AppShellPageProps;

export default Page;
