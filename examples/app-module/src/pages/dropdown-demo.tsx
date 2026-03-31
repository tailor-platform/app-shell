import {
  defineResource,
  Layout,
  Card,
  Button,
  Select,
  Combobox,
  Autocomplete,
  Dialog,
} from "@tailor-platform/app-shell";
import * as React from "react";

interface Fruit {
  id: string;
  name: string;
  emoji: string;
}

const fruits: Fruit[] = [
  { id: "apple", name: "Apple", emoji: "🍎" },
  { id: "banana", name: "Banana", emoji: "🍌" },
  { id: "cherry", name: "Cherry", emoji: "🍒" },
  { id: "grape", name: "Grape", emoji: "🍇" },
  { id: "mango", name: "Mango", emoji: "🥭" },
  { id: "orange", name: "Orange", emoji: "🍊" },
  { id: "peach", name: "Peach", emoji: "🍑" },
  { id: "strawberry", name: "Strawberry", emoji: "🍓" },
];

const groupedFruits = [
  {
    label: "Tropical",
    items: [
      { id: "banana", name: "Banana", emoji: "🍌" },
      { id: "mango", name: "Mango", emoji: "🥭" },
      { id: "pineapple", name: "Pineapple", emoji: "🍍" },
    ],
  },
  {
    label: "Berries",
    items: [
      { id: "cherry", name: "Cherry", emoji: "🍒" },
      { id: "grape", name: "Grape", emoji: "🍇" },
      { id: "strawberry", name: "Strawberry", emoji: "🍓" },
    ],
  },
];

const allProgrammingLanguages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Scala",
  "Haskell",
  "Elixir",
  "Clojure",
  "Dart",
  "Lua",
  "R",
  "Julia",
  "Zig",
  "Nim",
  "OCaml",
  "Erlang",
  "Perl",
  "Bash",
  "SQL",
  "HTML",
  "CSS",
];

/**
 * Example: Combobox creatable with a confirmation dialog.
 * Demonstrates awaiting user input in onCreateItem via Promise.
 */
const CreatableWithDialog = ({
  items,
  onItemsChange,
}: {
  items: { id: string; name: string }[];
  onItemsChange: React.Dispatch<React.SetStateAction<{ id: string; name: string }[]>>;
}) => {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    value: string;
    resolve: (result: { id: string; name: string } | false) => void;
  } | null>(null);

  return (
    <>
      <Combobox
        items={items}
        mapItem={(item) => ({ label: item.name, key: item.id })}
        onCreateItem={(value) =>
          new Promise<{ id: string; name: string } | false>((resolve) => {
            setDialogState({ open: true, value, resolve });
          })
        }
        placeholder="Search or create (with confirm)..."
      />
      <Dialog.Root
        open={dialogState?.open ?? false}
        onOpenChange={(open) => {
          if (!open && dialogState) {
            dialogState.resolve(false);
            setDialogState(null);
          }
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Create new item</Dialog.Title>
            <Dialog.Description>
              Are you sure you want to create &quot;{dialogState?.value}&quot;?
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button
              variant="outline"
              onClick={() => {
                dialogState?.resolve(false);
                setDialogState(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (dialogState) {
                  const item = {
                    id: crypto.randomUUID(),
                    name: dialogState.value,
                  };
                  onItemsChange((prev) => [...prev, item]);
                  dialogState.resolve(item);
                  setDialogState(null);
                }
              }}
            >
              Create
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

const DropdownComponentsDemoPage = () => {
  const [selectedFruits, setSelectedFruits] = React.useState<Fruit[]>([]);
  const [creatableItems, setCreatableItems] = React.useState<{ id: string; name: string }[]>([
    { id: "1", name: "React" },
    { id: "2", name: "Vue" },
    { id: "3", name: "Angular" },
    { id: "4", name: "Svelte" },
  ]);

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  };
  const subHeadingStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: "0.5rem",
    fontSize: "0.875rem",
    color: "var(--muted-foreground)",
  };
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1.5rem",
  };

  return (
    <Layout>
      <Layout.Header title="Select / Combobox / Autocomplete" />
      <Layout.Column>
        {/* ── Select ── */}
        <Card.Root>
          <Card.Header title="Select" />
          <Card.Content>
            <div style={gridStyle}>
              {/* Basic (string items) */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Basic</div>
                <Select items={["Apple", "Banana", "Cherry", "Grape"]} placeholder="Pick a fruit" />
              </div>

              {/* Custom render */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Custom render</div>
                <Select
                  items={fruits}
                  mapItem={(f) => ({
                    label: f.name,
                    key: f.id,
                    render: (
                      <span>
                        {f.emoji} {f.name}
                      </span>
                    ),
                  })}
                  placeholder="With emoji"
                />
              </div>

              {/* Multiple selection */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Multiple</div>
                <Select
                  items={fruits}
                  mapItem={(f) => ({ label: f.name, key: f.id })}
                  multiple
                  value={selectedFruits}
                  onValueChange={setSelectedFruits}
                  placeholder="Pick fruits"
                />
              </div>

              {/* Grouped items */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Grouped</div>
                <Select
                  items={groupedFruits}
                  mapItem={(f) => ({ label: f.name, key: f.id })}
                  placeholder="Grouped select"
                />
              </div>

              {/* Disabled */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Disabled</div>
                <Select items={["Apple", "Banana"]} placeholder="Disabled" disabled />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {/* ── Select.Async ── */}
        <Card.Root>
          <Card.Header title="Select.Async" />
          <Card.Content>
            <div style={gridStyle}>
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Single</div>
                <Select.Async
                  fetcher={async () => {
                    await new Promise((r) => setTimeout(r, 800));
                    return fruits;
                  }}
                  mapItem={(f) => ({
                    label: f.name,
                    key: f.id,
                    render: (
                      <span>
                        {f.emoji} {f.name}
                      </span>
                    ),
                  })}
                  placeholder="Async select..."
                  loadingText="Loading fruits..."
                />
              </div>

              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Multiple</div>
                <Select.Async
                  fetcher={async () => {
                    await new Promise((r) => setTimeout(r, 800));
                    return fruits;
                  }}
                  mapItem={(f) => ({ label: f.name, key: f.id })}
                  multiple
                  placeholder="Async multi-select..."
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {/* ── Combobox ── */}
        <Card.Root>
          <Card.Header title="Combobox" />
          <Card.Content>
            <div style={gridStyle}>
              {/* Basic string items */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Basic</div>
                <Combobox
                  items={["Apple", "Banana", "Cherry", "Grape", "Mango", "Orange"]}
                  placeholder="Search fruit..."
                />
              </div>

              {/* Custom render */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Custom render</div>
                <Combobox
                  items={fruits}
                  mapItem={(f) => ({
                    label: f.name,
                    key: f.id,
                    render: (
                      <span>
                        {f.emoji} {f.name}
                      </span>
                    ),
                  })}
                  placeholder="With emoji"
                />
              </div>

              {/* Multiple */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Multiple (chips)</div>
                <Combobox
                  items={fruits}
                  mapItem={(f) => ({ label: f.name, key: f.id })}
                  multiple
                  placeholder="Add fruits..."
                />
              </div>

              {/* Grouped */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Grouped</div>
                <Combobox
                  items={groupedFruits}
                  mapItem={(f) => ({ label: f.name, key: f.id })}
                  placeholder="Search grouped..."
                />
              </div>

              {/* Disabled */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Disabled</div>
                <Combobox items={["Apple", "Banana"]} placeholder="Disabled" disabled />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {/* ── Combobox.Async ── */}
        <Card.Root>
          <Card.Header title="Combobox.Async" />
          <Card.Content>
            <div style={gridStyle}>
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Single</div>
                <Combobox.Async
                  fetcher={async (query) => {
                    await new Promise((r) => setTimeout(r, 400));
                    return allProgrammingLanguages.filter((l) =>
                      l.toLowerCase().includes(query.toLowerCase()),
                    );
                  }}
                  placeholder="Search programming language..."
                  loadingText="Searching..."
                  emptyText="No programming languages found."
                />
              </div>

              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Multiple</div>
                <Combobox.Async
                  fetcher={async (query) => {
                    await new Promise((r) => setTimeout(r, 400));
                    return allProgrammingLanguages.filter((l) =>
                      l.toLowerCase().includes(query.toLowerCase()),
                    );
                  }}
                  multiple
                  placeholder="Add programming languages..."
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {/* ── Combobox (creatable) ── */}
        <Card.Root>
          <Card.Header title="Combobox (creatable)" />
          <Card.Content>
            <div style={gridStyle}>
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Single</div>
                <Combobox
                  items={creatableItems}
                  mapItem={(item) => ({ label: item.name, key: item.id })}
                  onCreateItem={async (value) => {
                    const item = { id: crypto.randomUUID(), name: value };
                    setCreatableItems((prev) => [...prev, item]);
                    return item;
                  }}
                  formatCreateLabel={(v) => `Create "${v}"`}
                  placeholder="Search or create..."
                />
              </div>

              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Multiple (async)</div>
                <Combobox
                  items={creatableItems}
                  mapItem={(item) => ({ label: item.name, key: item.id })}
                  onCreateItem={async (value) => {
                    await new Promise((r) => setTimeout(r, 500));
                    const item = { id: crypto.randomUUID(), name: value };
                    setCreatableItems((prev) => [...prev, item]);
                    return item;
                  }}
                  multiple
                  placeholder="Add or create tags..."
                />
              </div>

              <div style={sectionStyle}>
                <div style={subHeadingStyle}>With confirmation dialog</div>
                <CreatableWithDialog items={creatableItems} onItemsChange={setCreatableItems} />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {/* ── Autocomplete ── */}
        <Card.Root>
          <Card.Header title="Autocomplete" />
          <Card.Content>
            <div style={gridStyle}>
              {/* Basic string items */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Basic</div>
                <Autocomplete
                  items={["Apple", "Banana", "Cherry", "Grape", "Mango", "Orange"]}
                  placeholder="Type a fruit..."
                />
              </div>

              {/* Custom render */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Custom render</div>
                <Autocomplete
                  items={fruits}
                  mapItem={(f) => ({
                    label: f.name,
                    key: f.id,
                    render: (
                      <span>
                        {f.emoji} {f.name}
                      </span>
                    ),
                  })}
                  placeholder="With emoji"
                />
              </div>

              {/* Grouped */}
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Grouped</div>
                <Autocomplete
                  items={groupedFruits}
                  mapItem={(f) => ({ label: f.name, key: f.id })}
                  placeholder="Grouped autocomplete..."
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        {/* ── Autocomplete.Async ── */}
        <Card.Root>
          <Card.Header title="Autocomplete.Async" />
          <Card.Content>
            <div style={gridStyle}>
              <div style={sectionStyle}>
                <div style={subHeadingStyle}>Async search</div>
                <Autocomplete.Async
                  fetcher={async (query) => {
                    await new Promise((r) => setTimeout(r, 400));
                    return allProgrammingLanguages.filter((l) =>
                      l.toLowerCase().includes(query.toLowerCase()),
                    );
                  }}
                  placeholder="Search programming language..."
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      </Layout.Column>
    </Layout>
  );
};

export const dropdownComponentsDemoResource = defineResource({
  path: "dropdown-demo",
  meta: {
    title: "Dropdown Components Demo",
  },
  component: DropdownComponentsDemoPage,
});
