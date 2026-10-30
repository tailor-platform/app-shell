import { Layout, Text } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Layout>
      <Layout.Column>
        <Text.h2>Main Content</Text.h2>
        <Text.p>Your main content goes here...</Text.p>
      </Layout.Column>
      <Layout.Column>
        <Text.h2>Sidebar</Text.h2>
        <Text.p>Additional info or actions...</Text.p>
      </Layout.Column>
    </Layout>
  );
}
