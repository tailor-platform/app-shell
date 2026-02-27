import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { ProjectDetailPage } from "shared-pages";
import { paths } from "../../../routes.generated";

const Page = () => {
  return <ProjectDetailPage backTo={paths.for("/projects")} />;
};

Page.appShellPageProps = {
  meta: {
    title: "Project Detail",
  },
} satisfies AppShellPageProps;

export default Page;
