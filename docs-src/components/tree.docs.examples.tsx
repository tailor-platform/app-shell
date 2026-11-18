import { useEffect, useState } from "react";
import {
  Button,
  Field,
  Select,
  Text,
  Tree,
  TreePicker,
  type TreeSelectionStrategy,
} from "@tailor-platform/app-shell";

export function BasicUsage() {
  type Account = { code: string; name: string; children?: Account[] };
  const accounts: Account[] = [
    {
      code: "1000",
      name: "Assets",
      children: [
        { code: "1110", name: "Cash at bank" },
        { code: "1120", name: "Accounts receivable" },
      ],
    },
    { code: "2000", name: "Liabilities" },
  ];
  const [lastAction, setLastAction] = useState("None");

  return (
    <div className="flex flex-col gap-3">
      <Tree
        aria-label="Chart of accounts"
        className="h-48"
        items={accounts}
        mapItem={(account) => ({
          key: account.code,
          label: `${account.code} ${account.name}`,
          children: account.children,
        })}
        onAction={(account) => setLastAction(`${account.code} ${account.name}`)}
      />
      <Text.p role="status">Last action: {lastAction}</Text.p>
    </div>
  );
}

export function Keys() {
  type Bin = { code: string };
  type Warehouse = { id: string; name: string; bins: Bin[] };
  type StockNode = Warehouse | Bin;
  const isWarehouse = (node: StockNode): node is Warehouse => "bins" in node;
  const warehouses: StockNode[] = [
    { id: "wh-east", name: "East warehouse", bins: [{ code: "A1" }, { code: "A2" }] },
    { id: "wh-west", name: "West warehouse", bins: [{ code: "A1" }, { code: "A2" }] },
  ];
  const [value, setValue] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-3">
      <Tree
        aria-label="Warehouse bins with unique keys"
        className="h-56"
        items={warehouses}
        mapItem={(item, { parents }) =>
          isWarehouse(item)
            ? { key: item.id, label: item.name, children: item.bins }
            : { key: `${parents.find(isWarehouse)?.id}/${item.code}`, label: item.code }
        }
        selectionMode="checkbox"
        value={value}
        onValueChange={setValue}
      />
      <Text.p role="status">Selected keys: {JSON.stringify(value)}</Text.p>
    </div>
  );
}

export function SingleSelection() {
  type Account = { code: string; name: string; children?: Account[] };
  const accounts: Account[] = [
    {
      code: "1000",
      name: "Assets",
      children: [
        { code: "1110", name: "Cash at bank" },
        { code: "1120", name: "Accounts receivable" },
      ],
    },
    { code: "2000", name: "Liabilities" },
  ];
  const [selected, setSelected] = useState<string | null>("1110");

  return (
    <div className="flex flex-col gap-3">
      <Tree
        aria-label="Choose an account"
        className="h-48"
        items={accounts}
        mapItem={(account) => ({
          key: account.code,
          label: `${account.code} ${account.name}`,
          children: account.children,
        })}
        selectionMode="single"
        selectedKey={selected}
        onSelectedKeyChange={setSelected}
      />
      <Text.p role="status">Selected account: {selected ?? "None"}</Text.p>
    </div>
  );
}

export function CheckboxSelection() {
  type Item = { sku: string; name: string; children?: Item[] };
  const items: Item[] = [
    {
      sku: "accessories",
      name: "Accessories",
      children: [
        { sku: "CAP", name: "Embroidered cap" },
        { sku: "TOTE", name: "Canvas tote" },
      ],
    },
  ];
  const [skus, setSkus] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-3">
      <Tree
        aria-label="Products to order"
        className="h-40"
        items={items}
        mapItem={(item) => ({ key: item.sku, label: item.name, children: item.children })}
        selectionMode="checkbox"
        value={skus}
        onValueChange={setSkus}
      />
      <Text.p role="status">Selected SKUs: {JSON.stringify(skus)}</Text.p>
    </div>
  );
}

export function SelectionStrategies() {
  type Node = { key: string; children?: Node[] };
  const items: Node[] = [{ key: "P", children: [{ key: "A" }, { key: "B" }] }];
  const strategies: TreeSelectionStrategy[] = [
    "leaves",
    "topmost",
    "all",
    "cascade",
    "independent",
  ];
  const [strategy, setStrategy] = useState<TreeSelectionStrategy>("leaves");
  const [value, setValue] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-3">
      <Select
        aria-label="Selection strategy"
        items={strategies}
        value={strategy}
        onValueChange={(next) => {
          if (next) {
            setStrategy(next);
            setValue([]);
          }
        }}
      />
      <Tree
        key={strategy}
        aria-label="Compare selection strategies"
        className="h-40"
        items={items}
        mapItem={(item) => ({ key: item.key, label: item.key, children: item.children })}
        selectionMode="checkbox"
        selectionStrategy={strategy}
        value={value}
        onValueChange={setValue}
      />
      <Text.p role="status">Value: {JSON.stringify(value)}</Text.p>
    </div>
  );
}

export function CustomRows() {
  type Product = { sku: string; name: string; price: number };
  type Category = { id: string; name: string; products: Product[] };
  type CatalogNode = Category | Product;
  const items: CatalogNode[] = [
    {
      id: "accessories",
      name: "Accessories",
      products: [
        { sku: "CAP", name: "Embroidered cap", price: 14.25 },
        { sku: "TOTE", name: "Canvas tote", price: 22 },
      ],
    },
  ];

  return (
    <Tree
      aria-label="Products with prices"
      className="h-40"
      items={items}
      mapItem={(item) =>
        "products" in item
          ? { key: item.id, label: item.name, children: item.products }
          : { key: item.sku, label: item.name }
      }
      renderItem={({ item }) =>
        "price" in item ? (
          <span className="flex w-full justify-between gap-3">
            <span>{item.name}</span>
            <span className="text-muted-foreground tabular-nums">${item.price.toFixed(2)}</span>
          </span>
        ) : (
          <strong>{item.name}</strong>
        )
      }
    />
  );
}

export function Filtering() {
  type Account = { code: string; name: string; children?: Account[] };
  const accounts: Account[] = [
    {
      code: "1000",
      name: "Assets",
      children: [
        { code: "1110", name: "Cash at bank" },
        { code: "1120", name: "Accounts receivable" },
      ],
    },
    {
      code: "2000",
      name: "Liabilities",
      children: [{ code: "2100", name: "Accounts payable" }],
    },
  ];
  const [query, setQuery] = useState("");
  const [value, setValue] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-3">
      <Field.Root>
        <Field.Label>Filter accounts</Field.Label>
        <Field.Control
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try Accounts"
        />
      </Field.Root>
      <Tree
        aria-label="Filtered accounts"
        className="h-56"
        items={accounts}
        mapItem={(account) => ({
          key: account.code,
          label: `${account.code} ${account.name}`,
          children: account.children,
        })}
        filter={
          query.trim()
            ? (_, { label }) => label.toLowerCase().includes(query.trim().toLowerCase())
            : undefined
        }
        selectionMode="checkbox"
        value={value}
        onValueChange={setValue}
      />
      <Text.p role="status">Selected keys: {JSON.stringify(value)}</Text.p>
    </div>
  );
}

export function WithForm() {
  type Bin = { code: string; name: string; children?: Bin[] };
  const bins: Bin[] = [
    {
      code: "east",
      name: "East warehouse",
      children: [
        { code: "east/A1", name: "A1" },
        { code: "east/A2", name: "A2" },
      ],
    },
  ];
  const [submitted, setSubmitted] = useState<string[] | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(new FormData(event.currentTarget).getAll("bins").map(String));
      }}
    >
      <Field.Root name="bins">
        <Field.Label>Bins to count</Field.Label>
        <Tree
          className="h-40"
          items={bins}
          mapItem={(bin) => ({ key: bin.code, label: bin.name, children: bin.children })}
          selectionMode="checkbox"
          required
        />
        <Field.Description>Pick at least one bin. Enter on a row also submits.</Field.Description>
        <Field.Error match="valueMissing">Pick at least one bin.</Field.Error>
      </Field.Root>
      <Button type="submit">Start count</Button>
      <Text.p role="status">
        {submitted === null
          ? "Nothing submitted yet."
          : `Submitted bins: ${JSON.stringify(submitted)}`}
      </Text.p>
    </form>
  );
}

export function DisabledItems() {
  type Bin = { code: string; name: string; counting?: boolean; children?: Bin[] };
  const bins: Bin[] = [
    {
      code: "east",
      name: "East warehouse",
      children: [
        { code: "east/A1", name: "A1 — available" },
        { code: "east/A2", name: "A2 — counting", counting: true },
      ],
    },
    {
      code: "west",
      name: "West warehouse — counting",
      counting: true,
      children: [{ code: "west/A1", name: "A1" }],
    },
  ];
  const [value, setValue] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-3">
      <Tree
        aria-label="Bins with disabled items"
        className="h-48"
        items={bins}
        mapItem={(bin) => ({
          key: bin.code,
          label: bin.name,
          children: bin.children,
          disabled: bin.counting,
        })}
        selectionMode="checkbox"
        value={value}
        onValueChange={setValue}
      />
      <Text.p role="status">Selected bins: {JSON.stringify(value)}</Text.p>
    </div>
  );
}

export function Picker() {
  type Product = { sku: string; name: string };
  type Category = { id: string; name: string; products: Product[] };
  type CatalogNode = Category | Product;
  const isProduct = (item: CatalogNode): item is Product => "sku" in item;
  const categories: CatalogNode[] = [
    {
      id: "accessories",
      name: "Accessories",
      products: [
        { sku: "CAP", name: "Embroidered cap" },
        { sku: "TOTE", name: "Canvas tote" },
      ],
    },
    {
      id: "clothing",
      name: "Clothing",
      products: [{ sku: "TEE", name: "Cotton tee" }],
    },
  ];
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Product[]>([]);

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setOpen(true)}>Add items from catalogue</Button>
      <Text.p role="status">
        Added items: {picked.map((item) => item.name).join(", ") || "None"}
      </Text.p>
      <TreePicker
        open={open}
        onOpenChange={setOpen}
        title="Add items from catalogue"
        items={categories}
        mapItem={(item) =>
          isProduct(item)
            ? { key: item.sku, label: item.name }
            : { key: item.id, label: item.name, children: item.products }
        }
        matchesSearch={(item, query) => item.name.toLowerCase().includes(query.toLowerCase())}
        onCommit={(selected) =>
          setPicked(selected.flatMap(({ item }) => (isProduct(item) ? [item] : [])))
        }
      />
    </div>
  );
}

export function AsyncCatalogue() {
  type Item = { id: string; name: string; children?: Item[] };
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setItems([
        {
          id: "accessories",
          name: "Accessories",
          children: [
            { id: "CAP", name: "Embroidered cap" },
            { id: "TOTE", name: "Canvas tote" },
          ],
        },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={() => {
          setItems([]);
          setLoading(true);
          setOpen(true);
        }}
      >
        Load catalogue
      </Button>
      <Text.p role="status">Added items: {picked.join(", ") || "None"}</Text.p>
      <TreePicker
        open={open}
        onOpenChange={setOpen}
        title="Load items from catalogue"
        items={items}
        mapItem={(item) => ({ key: item.id, label: item.name, children: item.children })}
        emptyText={loading ? "Loading catalogue…" : undefined}
        onCommit={(selected) => setPicked(selected.map(({ item }) => item.name))}
      />
    </div>
  );
}
