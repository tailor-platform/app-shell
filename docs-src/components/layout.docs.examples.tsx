import { Button, Layout, Text } from "@tailor-platform/app-shell";

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

export function FourColumns() {
  return (
    <Layout>
      <Layout.Column>
        <Text.p className="rounded border p-4">First quarter</Text.p>
      </Layout.Column>
      <Layout.Column>
        <Text.p className="rounded border p-4">Second quarter</Text.p>
      </Layout.Column>
      <Layout.Column>
        <Text.p className="rounded border p-4">Third quarter</Text.p>
      </Layout.Column>
      <Layout.Column>
        <Text.p className="rounded border p-4">Fourth quarter</Text.p>
      </Layout.Column>
    </Layout>
  );
}

export function PageHeader() {
  return (
    <Layout>
      <Layout.Header
        title="Order #12345"
        actions={[
          <Button key="edit">Edit</Button>,
          <Button key="delete" variant="destructive">
            Delete
          </Button>,
        ]}
      />
      <Layout.Column>
        <Text.p>Order line items</Text.p>
      </Layout.Column>
      <Layout.Column>
        <Text.p>Shipping details</Text.p>
      </Layout.Column>
    </Layout>
  );
}

export function HeaderWithChildren() {
  return (
    <Layout>
      <Layout.Header title="Order #12345" actions={[<Button key="edit">Edit</Button>]}>
        <Text.p variant="body-sm" className="text-muted-foreground">
          Supplier · Due 30 Nov 2026
        </Text.p>
      </Layout.Header>
      <Layout.Column>
        <Text.p>Order line items</Text.p>
      </Layout.Column>
    </Layout>
  );
}

export function AreaMode() {
  return (
    <Layout>
      <Layout.Column area="left">
        <Text.p className="rounded border p-4">Sidebar</Text.p>
      </Layout.Column>
      <Layout.Column area="main">
        <Text.h2>Content</Text.h2>
      </Layout.Column>
    </Layout>
  );
}

export function GapSpacing() {
  return (
    <Layout gap={6}>
      <Layout.Column>
        <Text.p className="rounded border p-4">Main content</Text.p>
      </Layout.Column>
      <Layout.Column>
        <Text.p className="rounded border p-4">Sidebar</Text.p>
      </Layout.Column>
    </Layout>
  );
}

export function CustomLayout() {
  return (
    <Layout className="bg-muted rounded-lg">
      <Layout.Column>
        <Text.p className="p-4">A muted layout surface</Text.p>
      </Layout.Column>
    </Layout>
  );
}

export function ColumnStyling() {
  return (
    <Layout>
      <Layout.Column className="bg-card shadow-sm">
        <Text.p className="p-4">Main content with a background and shadow</Text.p>
      </Layout.Column>
      <Layout.Column className="space-y-4">
        <Text.p>Sidebar overview</Text.p>
        <Text.p>Additional information</Text.p>
      </Layout.Column>
    </Layout>
  );
}
