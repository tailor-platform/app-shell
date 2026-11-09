import {
  Button,
  Card,
  Tree,
  TreePicker,
  Field,
  Layout,
  type AppShellPageProps,
  type TreeSelectionStrategy,
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

const CATALOG: CatalogNode[] = [
  { id: "tees", name: "T-Shirts", products: pick("TEE") },
  { id: "outerwear", name: "Outerwear", products: pick("HOOD", "JKT") },
  { id: "accessories", name: "Accessories", products: pick("CAP", "TOTE") },
  // The tote is also in the gift edit: it has one key, so it's one selection.
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

const isWarehouse = (node: StockNode): node is Warehouse => "bins" in node;

const STOCK_NODES: StockNode[] = [
  {
    id: "wh-tokyo",
    name: "Tokyo",
    bins: [{ code: "A1" }, { code: "A2" }, { code: "B1", counting: true }],
  },
  { id: "wh-osaka", name: "Osaka", bins: [{ code: "A1" }, { code: "A2" }] },
];

const money = (n: number) => `$${n.toFixed(2)}`;

// 🧪 Dummy Data: Replace with real data later — a chart of accounts, for browsing and single selection
type Account = { code: string; name: string; balance?: number; children?: Account[] };

const ACCOUNTS: Account[] = [
  {
    code: "1000",
    name: "Assets",
    children: [
      {
        code: "1100",
        name: "Current assets",
        children: [
          { code: "1110", name: "Cash at bank", balance: 182_400 },
          { code: "1120", name: "Accounts receivable", balance: 64_250 },
          { code: "1130", name: "Inventory", balance: 97_800 },
        ],
      },
      { code: "1500", name: "Plant & equipment", balance: 410_000 },
    ],
  },
  {
    code: "2000",
    name: "Liabilities",
    children: [
      { code: "2100", name: "Accounts payable", balance: 38_900 },
      { code: "2200", name: "GST payable", balance: 7_420 },
    ],
  },
];

const mapAccount = (account: Account) => ({
  key: account.code,
  label: `${account.code} ${account.name}`,
  children: account.children,
});

const findAccount = (accounts: Account[], code: string | null): Account | undefined => {
  for (const account of accounts) {
    if (account.code === code) return account;
    const found = findAccount(account.children ?? [], code);
    if (found) return found;
  }
  return undefined;
};

const STRATEGIES: TreeSelectionStrategy[] = ["leaves", "topmost", "all", "cascade", "independent"];

/** A product row with its price on the right; a category row is just its name. */
const renderCatalogItem = ({ item }: { item: CatalogNode }) => (
  <span className="flex w-full items-center justify-between gap-3">
    <span className="flex flex-col">
      <span className="text-sm">{item.name}</span>
      {isCategory(item) ? null : (
        <span className="text-muted-foreground font-mono text-xs">{item.sku}</span>
      )}
    </span>
    {isCategory(item) ? null : (
      <span className="text-muted-foreground tabular-nums">{money(item.price)}</span>
    )}
  </span>
);

const TreeDemoPage = () => {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Product[]>([]);
  const [skus, setSkus] = useState<string[]>([]);
  const [bins, setBins] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<string[] | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [accountCode, setAccountCode] = useState<string | null>("1110");
  const [strategy, setStrategy] = useState<TreeSelectionStrategy>("leaves");
  const [ticked, setTicked] = useState<string[]>([]);
  const account = findAccount(ACCOUNTS, accountCode);

  return (
    <Layout>
      <Layout.Column>
        {/* 🔽 Browse: selectionMode "none" (the default), clicking a leaf runs onAction */}
        <Card.Root>
          <Card.Header
            title="Browse"
            description={`The default mode: no selection. Clicking an account runs onAction. Last action: ${lastAction ?? "none"}.`}
          />
          <Card.Content padding="none">
            <Tree
              aria-label="Chart of accounts"
              className="h-72"
              items={ACCOUNTS}
              mapItem={mapAccount}
              onAction={(item) => setLastAction(`${item.code} ${item.name}`)}
            />
          </Card.Content>
        </Card.Root>

        {/* 🔽 Master–detail: selectionMode "single" */}
        <Card.Root>
          <Card.Header
            title="Master–detail"
            description='selectionMode="single" keeps one selected row, parents included. Selecting a closed parent opens it.'
          />
          <Card.Content padding="none">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <Tree
                aria-label="Accounts"
                className="h-72 sm:border-r"
                items={ACCOUNTS}
                mapItem={mapAccount}
                selectionMode="single"
                selectedKey={accountCode}
                onSelectedKeyChange={(key) => setAccountCode(key)}
              />
              <div className="flex flex-col gap-1 p-6 text-sm">
                {account ? (
                  <>
                    <span className="text-muted-foreground font-mono text-xs">{account.code}</span>
                    <span className="text-base font-medium">{account.name}</span>
                    <span className="text-muted-foreground">
                      {account.balance === undefined
                        ? `${account.children?.length ?? 0} sub-accounts`
                        : `Balance ${money(account.balance)}`}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select an account.</span>
                )}
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {/* 🔽 How ticking works: selectionStrategy */}
        <Card.Root>
          <Card.Header
            title="How ticking works"
            description='selectionStrategy decides whether a parent is data or a folder, and what comes back. "leaves", "topmost" and "all" treat parents as folders; "cascade" and "independent" let a parent be ticked on its own.'
          />
          <Card.Content className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground w-36">selectionStrategy</span>
              {STRATEGIES.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={strategy === option ? "default" : "outline"}
                  onClick={() => {
                    setStrategy(option);
                    setTicked([]);
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
            <div className="rounded-md border">
              <Tree
                key={strategy}
                aria-label="Accounts to export"
                className="h-72"
                items={ACCOUNTS}
                mapItem={mapAccount}
                selectionMode="checkbox"
                selectionStrategy={strategy}
                value={ticked}
                onValueChange={setTicked}
              />
            </div>
            <span className="text-muted-foreground font-mono text-xs">
              value = {JSON.stringify(ticked)}
            </span>
          </Card.Content>
        </Card.Root>

        {/* 🔽 TreePicker: pick, then add */}
        <Card.Root>
          <Card.Header
            title="TreePicker"
            description="Search and pick many products from a grouped catalogue, then commit them in one batch."
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

        {/* 🔽 Checkbox tree inline: a product in two categories has one key, so it's one selection */}
        <Card.Root>
          <Card.Header
            title="Checkbox tree"
            description={`${skus.length} selected: ${skus.join(", ") || "none"}. The tote and cap are also in "Gift edit"; ticking either copy ticks both.`}
          />
          <Card.Content padding="none">
            <Tree
              selectionMode="checkbox"
              aria-label="Catalog"
              className="h-80"
              items={CATALOG}
              mapItem={mapCatalogItem}
              renderItem={renderCatalogItem}
              value={skus}
              onValueChange={setSkus}
            />
          </Card.Content>
        </Card.Root>

        {/* 🔽 Tree in a form: A1 in Tokyo and A1 in Osaka are different bins, so keys include the warehouse */}
        <Card.Root>
          <Card.Header
            title="Tree in a form"
            description="Bin codes repeat across warehouses, so each bin's key includes its warehouse. B1 is locked while it's being counted. Submit to see the form data."
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
                <Tree
                  selectionMode="checkbox"
                  className="h-72 rounded-md border"
                  items={STOCK_NODES}
                  mapItem={(node, { parents }) =>
                    isWarehouse(node)
                      ? { key: node.id, label: node.name, children: node.bins }
                      : {
                          // `parents` has the union type too. A type guard, unlike
                          // `parents[0] as Warehouse`, has TypeScript check there's
                          // a warehouse above (hence `?.`).
                          key: `${parents.find(isWarehouse)?.id}/${node.code}`,
                          label: node.code,
                          disabled: node.counting,
                        }
                  }
                  renderItem={({ item, isLeaf }) => (
                    <span className="flex w-full justify-between gap-3">
                      <span>{"name" in item ? item.name : item.code}</span>
                      {isLeaf && "code" in item && item.counting ? (
                        <span className="text-muted-foreground">Counting</span>
                      ) : null}
                    </span>
                  )}
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

        <TreePicker
          open={open}
          onOpenChange={setOpen}
          title="Add products"
          items={CATALOG}
          mapItem={mapCatalogItem}
          renderItem={renderCatalogItem}
          matchesSearch={(node, query) =>
            `${isCategory(node) ? node.id : node.sku} ${node.name}`
              .toLowerCase()
              .includes(query.toLowerCase())
          }
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

TreeDemoPage.appShellPageProps = {
  meta: {
    title: "Tree",
  },
} satisfies AppShellPageProps;

export default TreeDemoPage;
