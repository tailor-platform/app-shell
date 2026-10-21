import {
  Button,
  Card,
  Layout,
  TreePicker,
  TreeSelect,
  type AppShellPageProps,
  type TreePickerNode,
} from "@tailor-platform/app-shell";
import { useState } from "react";

// 🧪 Dummy Data: Replace with real data later
type CatalogItem = { sku: string; name: string; price: number };

const CATALOG: CatalogItem[] = [
  { sku: "DT-TEE-WHT-S", name: "Cotton Wreath Tee, White, Small", price: 18.5 },
  { sku: "DT-TEE-WHT-M", name: "Cotton Wreath Tee, White, Medium", price: 18.5 },
  { sku: "DT-TEE-GRY-XL", name: "Cotton Wreath Tee, Grey, XL", price: 19.75 },
  { sku: "DT-HOOD-BLK-M", name: "Heavyweight Hoodie, Black, Medium", price: 62 },
  { sku: "DT-JKT-DNM-L", name: "Denim Chore Jacket, Indigo, Large", price: 148 },
  { sku: "DT-CAP-BLK-OS", name: "Embroidered Cap, Black", price: 14.25 },
  { sku: "DT-TOTE-NAT-OS", name: "Canvas Tote, Natural", price: 22 },
];

const inGroup = (...codes: string[]) =>
  CATALOG.filter((c) => codes.some((code) => c.sku.includes(code))).map((c) => ({
    id: c.sku,
    data: c,
  }));

// 🧪 Dummy Data: Replace with real data later — groups are branches, products are leaves
const CATALOG_TREE: TreePickerNode<CatalogItem>[] = [
  { id: "group-tees", data: { sku: "TEES", name: "T-Shirts", price: 0 }, children: inGroup("TEE") },
  {
    id: "group-outerwear",
    data: { sku: "OUTER", name: "Outerwear", price: 0 },
    children: inGroup("HOOD", "JKT"),
  },
  {
    id: "group-accessories",
    data: { sku: "ACC", name: "Accessories", price: 0 },
    children: inGroup("CAP", "TOTE"),
  },
];

const money = (n: number) => `$${n.toFixed(2)}`;

const TreePickerDemoPage = () => {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CatalogItem[]>([]);
  const [inlineSelected, setInlineSelected] = useState<string[]>([]);

  return (
    <Layout>
      <Layout.Column>
        {/* 🔽 Trigger and the last committed picks */}
        <Card.Root>
          <Card.Header
            title="Tree picker"
            description="Pick many products from a grouped catalog and commit them in one batch."
          >
            <div className="flex items-center justify-end gap-2">
              <Button onClick={() => setOpen(true)}>Add items</Button>
            </div>
          </Card.Header>
          <Card.Content>
            {picked.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing picked yet.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {picked.map((item) => (
                  <li key={item.sku} className="flex justify-between gap-4">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">{item.sku}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
        </Card.Root>

        {/* 🔽 The same tree inline on the page — no dialog */}
        <Card.Root>
          <Card.Header
            title="Tree select (inline)"
            description={`${inlineSelected.length} selected — the tree on its own, for pages and panels.`}
          />
          <Card.Content padding="none">
            <TreeSelect<CatalogItem>
              aria-label="Catalog"
              className="h-80"
              items={CATALOG_TREE}
              rowLabel="Product name"
              metricLabel="Unit price"
              renderRow={({ node }) => <span className="text-sm">{node.data.name}</span>}
              renderMetric={({ node }) => (node.children ? null : money(node.data.price))}
              matchesSearch={({ node, query }) =>
                `${node.data.sku} ${node.data.name}`.toLowerCase().includes(query.toLowerCase())
              }
              value={inlineSelected}
              onValueChange={(ids) => setInlineSelected(ids)}
            />
          </Card.Content>
        </Card.Root>

        <TreePicker<CatalogItem>
          open={open}
          onOpenChange={setOpen}
          title="Add products"
          items={CATALOG_TREE}
          rowLabel="Product name"
          metricLabel="Unit price"
          renderRow={({ node }) => (
            <span className="flex flex-col">
              <span className="text-sm">{node.data.name}</span>
              {node.children ? null : (
                <span className="text-muted-foreground font-mono text-xs">{node.data.sku}</span>
              )}
            </span>
          )}
          renderMetric={({ node }) => (node.children ? null : money(node.data.price))}
          matchesSearch={({ node, query }) =>
            `${node.data.sku} ${node.data.name}`.toLowerCase().includes(query.toLowerCase())
          }
          onCommit={(nodes) => setPicked(nodes.map((node) => node.data))}
        />
      </Layout.Column>
    </Layout>
  );
};

TreePickerDemoPage.appShellPageProps = {
  meta: {
    title: "Tree Picker",
  },
} satisfies AppShellPageProps;

export default TreePickerDemoPage;
