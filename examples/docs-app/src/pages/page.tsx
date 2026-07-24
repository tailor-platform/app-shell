import { type AppShellPageProps, Layout } from "@tailor-platform/app-shell";

const HomePage = () => {
  return (
    <Layout>
      <Layout.Header title="app-shell docs" />
      <Layout.Column>
        <p className="max-w-2xl leading-relaxed">
          Browse components, patterns, and concepts from the sidebar. Every page is generated from a
          <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5">*.docs-outline.md</code>
          source and renders live, in-place examples.
        </p>
      </Layout.Column>
    </Layout>
  );
};

HomePage.appShellPageProps = {
  meta: { title: "Home" },
} satisfies AppShellPageProps;

export default HomePage;
