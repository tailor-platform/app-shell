import { type AppShellPageProps } from "@tailor-platform/app-shell";
import { DocumentForm } from "../page-templates";

const Page = () => <DocumentForm />;

Page.appShellPageProps = {
  meta: {
    title: "Document Form",
  },
} satisfies AppShellPageProps;

export default Page;
