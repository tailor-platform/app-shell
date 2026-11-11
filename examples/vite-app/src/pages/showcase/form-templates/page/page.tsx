import { type AppShellPageProps, useSearchParams } from "@tailor-platform/app-shell";
import { PageForm } from "../page-templates";

// `?nav=1` / `?nav=0` turns the section nav on or off; without it the
// template's default applies.
const Page = () => {
  const [searchParams] = useSearchParams();
  const nav = searchParams.get("nav");
  return <PageForm sectionNav={nav == null ? undefined : nav === "1"} />;
};

Page.appShellPageProps = {
  meta: {
    title: "Page Form",
  },
} satisfies AppShellPageProps;

export default Page;
