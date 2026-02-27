import {
  hidden,
  pass,
  type AppShellPageProps,
  type Guard,
} from "@tailor-platform/app-shell";
import { TaskListPage, CheckSquareIcon } from "shared-pages";

const adminOnlyGuard: Guard = ({ context }) => {
  if (context.role !== "admin") {
    return hidden();
  }
  return pass();
};

const Page = () => {
  return <TaskListPage />;
};

Page.appShellPageProps = {
  meta: {
    title: "Tasks",
    icon: <CheckSquareIcon />,
  },
  guards: [adminOnlyGuard],
} satisfies AppShellPageProps;

export default Page;
