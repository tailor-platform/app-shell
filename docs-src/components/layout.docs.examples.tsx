import { Layout } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Layout>
      <Layout.Column>
        <h2>Main Content</h2>
        <p>Your main content goes here...</p>
      </Layout.Column>
      <Layout.Column>
        <h2>Sidebar</h2>
        <p>Additional info or actions...</p>
      </Layout.Column>
    </Layout>
  );
}
