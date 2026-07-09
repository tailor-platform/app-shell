import { Button, Layout, Tabs } from "@tailor-platform/app-shell";
import { useState } from "react";

export function LayoutHeaderWithTabsExample() {
  const [bucket, setBucket] = useState("all");

  return (
    <Layout>
      <Layout.Header title="Purchase orders" actions={[<Button key="create">Create</Button>]}>
        <Tabs.Root value={bucket} onValueChange={setBucket}>
          <Tabs.List>
            <Tabs.Tab value="all">All</Tabs.Tab>
            <Tabs.Tab value="open">Open</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      </Layout.Header>
      <Layout.Column>
        <div className="min-h-24 rounded-md bg-surface-2" />
      </Layout.Column>
    </Layout>
  );
}
