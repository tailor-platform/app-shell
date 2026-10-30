import {
  Button,
  Card,
  CheckboxTree,
  CheckboxTreePicker,
  Field,
  Layout,
  type AppShellPageProps,
  type CheckboxTreeSelection,
} from "@tailor-platform/app-shell";
import { useState } from "react";

// 🧪 Dummy Data: Replace with real data later — categories are branches, products are leaves
type Product = { sku: string; name: string; price: number };
type Category = { id: string; name: string; products: Product[] };
type CatalogNode = Category | Product;

const PRODUCTS: Product[] = [
  { sku: "DT-TEE-WHT-S", name: "Cotton Wreath Tee, White, Small", price: 18.5 },
  { sku: "DT-TEE-WHT-M", name: "Cotton Wreath Tee, White, Medium", price: 18.5 },
  { sku: "DT-TEE-GRY-XL", name: "Cotton Wreath Tee, Grey, XL", price: 19.75 },
  { sku: "DT-HOOD-BLK-M", name: "Heavyweight Hoodie, Black, Medium", price: 62 },
  { sku: "DT-JKT-DNM-L", name: "Denim Chore Jacket, Indigo, Large", price: 148 },
  { sku: "DT-CAP-BLK-OS", name: "Embroidered Cap, Black", price: 14.25 },
  { sku: "DT-TOTE-NAT-OS", name: "Canvas Tote, Natural", price: 22 },
];

const pick = (...codes: string[]) =>
  PRODUCTS.filter((p) => codes.some((code) => p.sku.includes(code)));

const CATALOG: Category[] = [
  { id: "tees", name: "T-Shirts", products: pick("TEE") },
  { id: "outerwear", name: "Outerwear", products: pick("HOOD", "JKT") },
  { id: "accessories", name: "Accessories", products: pick("CAP", "TOTE") },
  // The tote is also in the gift edit: in the default "keys" shape it's one selection.
  { id: "gifts", name: "Gift edit", products: pick("TOTE", "CAP") },
];

const isCategory = (node: CatalogNode): node is Category => "products" in node;

const mapCatalogItem = (node: CatalogNode) =>
  isCategory(node)
    ? { key: node.id, label: node.name, children: node.products }
    : { key: node.sku, label: node.name };

// 🧪 Dummy Data: Replace with real data later — bin codes repeat across warehouses
type Bin = { code: string; counting?: boolean };
type Warehouse = { id: string; name: string; bins: Bin[] };
type StockNode = Warehouse | Bin;

const WAREHOUSES: Warehouse[] = [
  {
    id: "wh-tokyo",
    name: "Tokyo",
    bins: [{ code: "A1" }, { code: "A2" }, { code: "B1", counting: true }],
  },
  { id: "wh-osaka", name: "Osaka", bins: [{ code: "A1" }, { code: "A2" }] },
];

const money = (n: number) => `$${n.toFixed(2)}`;

const CheckboxTreeDemoPage = () => {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Product[]>([]);
  const [skus, setSkus] = useState<string[]>([]);
  const [bins, setBins] = useState<CheckboxTreeSelection>({});
  const [submitted, setSubmitted] = useState<string[] | null>(null);

  return (
    <Layout>
      <Layout.Column>
        {/* 🔽 CheckboxTreePicker: pick, then add */}
        <Card.Root>
          <Card.Header
            title="CheckboxTreePicker"
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

        {/* 🔽 CheckboxTree inline, "keys" shape: a product in two categories is one selection */}
        <Card.Root>
          <Card.Header
            title="CheckboxTree (keys)"
            description={`${skus.length} selected: ${skus.join(", ") || "none"}. The tote and cap are also in "Gift edit"; ticking either copy ticks both.`}
          />
          <Card.Content padding="none">
            <CheckboxTree<CatalogNode>
              aria-label="Catalog"
              className="h-80"
              items={CATALOG}
              mapItem={mapCatalogItem}
              itemHeader="Product name"
              matchesSearch={(node, query) =>
                `${isCategory(node) ? node.id : node.sku} ${node.name}`
                  .toLowerCase()
                  .includes(query.toLowerCase())
              }
              trailingColumn={{
                header: "Unit price",
                render: ({ item }) => (isCategory(item) ? null : money(item.price)),
              }}
              value={skus}
              onValueChange={setSkus}
            />
          </Card.Content>
        </Card.Root>

        {/* 🔽 CheckboxTree in a form, "exact" shape: A1 in Tokyo and A1 in Osaka are different bins */}
        <Card.Root>
          <Card.Header
            title="CheckboxTree in a form (exact)"
            description="Bin codes repeat across warehouses, so each bin is selected on its own. B1 is locked while it's being counted. Submit to see the form data."
          />
          <Card.Content>
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(new FormData(event.currentTarget).getAll("bins") as string[]);
              }}
            >
              <Field.Root name="bins">
                <Field.Label>Bins to count</Field.Label>
                <CheckboxTree<StockNode>
                  className="h-72 rounded-md border"
                  items={WAREHOUSES}
                  mapItem={(node) =>
                    "bins" in node
                      ? { key: node.id, label: node.name, children: node.bins }
                      : { key: node.code, label: node.code, disabled: node.counting }
                  }
                  itemHeader="Location"
                  trailingColumn={{
                    header: "Status",
                    render: ({ item, isLeaf }) =>
                      isLeaf && "code" in item && item.counting ? "Counting" : null,
                  }}
                  valueShape="exact"
                  value={bins}
                  onValueChange={setBins}
                  required
                />
                <Field.Description>
                  Pick at least one bin. Enter on a row submits.
                </Field.Description>
              </Field.Root>
              <div className="flex items-center gap-3">
                <Button type="submit">Start count</Button>
                {submitted ? (
                  <span className="text-muted-foreground font-mono text-xs">
                    bins = {JSON.stringify(submitted)}
                  </span>
                ) : null}
              </div>
            </form>
          </Card.Content>
        </Card.Root>

        <CheckboxTreePicker<CatalogNode>
          open={open}
          onOpenChange={setOpen}
          title="Add products"
          items={CATALOG}
          mapItem={mapCatalogItem}
          itemHeader="Product name"
          renderItem={({ item }) => (
            <span className="flex flex-col">
              <span className="text-sm">{item.name}</span>
              {isCategory(item) ? null : (
                <span className="text-muted-foreground font-mono text-xs">{item.sku}</span>
              )}
            </span>
          )}
          trailingColumn={{
            header: "Unit price",
            render: ({ item }) => (isCategory(item) ? null : money(item.price)),
          }}
          onCommit={(selected) =>
            setPicked(
              selected.map((entry) => entry.item).filter((n): n is Product => !isCategory(n)),
            )
          }
        />
      </Layout.Column>
    </Layout>
  );
};

CheckboxTreeDemoPage.appShellPageProps = {
  meta: {
    title: "Checkbox Tree",
  },
} satisfies AppShellPageProps;

export default CheckboxTreeDemoPage;
