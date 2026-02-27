import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { ProjectListPage, FolderIcon } from "shared-pages";
import { paths } from "../../routes.generated";

const Page = () => {
  return (
    <ProjectListPage linkTo={(id) => paths.for("/projects/:id", { id })} />
  );
};

Page.appShellPageProps = {
  meta: {
    title: "Projects",
    icon: <FolderIcon />,
  },
} satisfies AppShellPageProps;

export default Page;
