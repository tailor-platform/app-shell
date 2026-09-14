/* app-shell-scaffold: resource/list scaffold banner. */
/* pattern: list/dense-scan */
import { Button, Layout, Link, type AppShellPageProps } from "@tailor-platform/app-shell";
import { ListTable } from "./components/__TABLE_FILE__";

const Page = () => {
  return (
    <Layout fill>
      <Layout.Header
        title="__ENTITY_NAME_PLURAL_TITLE__"
        actions={[
          <Button key="create" render={<Link to="create" />}>
            Create __ENTITY_NAME_SINGULAR_TITLE_LOWER__
          </Button>,
        ]}
      />
      <Layout.Column>
        <ListTable />
      </Layout.Column>
    </Layout>
  );
};

Page.appShellPageProps = {
  meta: { title: "__ENTITY_NAME_PLURAL_TITLE__" },
} satisfies AppShellPageProps;

export default Page;
