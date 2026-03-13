import { useState } from "react";
import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { Combobox } from "@tailor-platform/app-shell";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const section: React.CSSProperties = {
  marginBottom: "2.5rem",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  marginBottom: "0.75rem",
  borderBottom: "1px solid hsl(var(--border))",
  paddingBottom: "0.5rem",
};

const code: React.CSSProperties = {
  fontSize: "0.75rem",
  backgroundColor: "hsl(var(--muted))",
  padding: "0.125rem 0.375rem",
  borderRadius: "0.25rem",
  fontFamily: "monospace",
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const fruits = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry" },
  { label: "Date", value: "date" },
  { label: "Elderberry", value: "elderberry" },
  { label: "Fig", value: "fig" },
  { label: "Grape", value: "grape" },
  { label: "Honeydew", value: "honeydew" },
  { label: "Kiwi", value: "kiwi" },
  { label: "Lemon", value: "lemon" },
];

// Simple tag type for creatable demos
interface Tag {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Fake async fetcher (simulates API call)
// ---------------------------------------------------------------------------
const allCountries = [
  "Argentina",
  "Australia",
  "Austria",
  "Belgium",
  "Brazil",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Denmark",
  "Egypt",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "India",
  "Indonesia",
  "Ireland",
  "Italy",
  "Japan",
  "Kenya",
  "Malaysia",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Russia",
  "Singapore",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "United Kingdom",
  "United States",
  "Venezuela",
  "Vietnam",
];

const fakeCountryFetcher = async (query: string, { signal }: { signal: AbortSignal }) => {
  // Simulate network delay
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 500);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
  if (!query.trim()) return [];
  return allCountries.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** 1. Basic Combobox */
function BasicCombobox() {
  return (
    <div style={{ maxWidth: "20rem" }}>
      <Combobox.Root>
        <Combobox.InputGroup>
          <Combobox.Input placeholder="Search fruits..." />
          <Combobox.Clear />
          <Combobox.Trigger />
        </Combobox.InputGroup>
        <Combobox.Content>
          <Combobox.List>
            {fruits.map((f) => (
              <Combobox.Item key={f.value} value={f.value}>
                {f.label}
              </Combobox.Item>
            ))}
            <Combobox.Empty>No results.</Combobox.Empty>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
    </div>
  );
}

/** 2. Combobox with Groups */
function GroupedCombobox() {
  return (
    <div style={{ maxWidth: "20rem" }}>
      <Combobox.Root>
        <Combobox.InputGroup>
          <Combobox.Input placeholder="Search..." />
          <Combobox.Clear />
          <Combobox.Trigger />
        </Combobox.InputGroup>
        <Combobox.Content>
          <Combobox.List>
            <Combobox.Group>
              <Combobox.GroupLabel>Citrus</Combobox.GroupLabel>
              <Combobox.Item value="lemon">Lemon</Combobox.Item>
              <Combobox.Item value="orange">Orange</Combobox.Item>
              <Combobox.Item value="lime">Lime</Combobox.Item>
            </Combobox.Group>
            <Combobox.Group>
              <Combobox.GroupLabel>Berries</Combobox.GroupLabel>
              <Combobox.Item value="strawberry">Strawberry</Combobox.Item>
              <Combobox.Item value="blueberry">Blueberry</Combobox.Item>
              <Combobox.Item value="raspberry">Raspberry</Combobox.Item>
            </Combobox.Group>
            <Combobox.Empty>No results.</Combobox.Empty>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
    </div>
  );
}

/** 3. Multiple Selection */
function MultipleCombobox() {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div style={{ maxWidth: "24rem" }}>
      <Combobox.Root<string, true> multiple value={selected} onValueChange={setSelected}>
        <Combobox.Chips>
          {selected.map((v) => (
            <Combobox.Chip key={v}>
              {fruits.find((f) => f.value === v)?.label ?? v}
              <Combobox.ChipRemove />
            </Combobox.Chip>
          ))}
          <Combobox.Input placeholder="Select multiple fruits..." />
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.List>
            {fruits.map((f) => (
              <Combobox.Item key={f.value} value={f.value}>
                {f.label}
              </Combobox.Item>
            ))}
            <Combobox.Empty>No results.</Combobox.Empty>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
    </div>
  );
}

/** 4. Async Combobox */
function AsyncCombobox() {
  const countries = Combobox.useAsync({
    fetcher: fakeCountryFetcher,
    debounceMs: 300,
  });

  return (
    <div style={{ maxWidth: "20rem" }}>
      <Combobox.Root
        items={countries.items}
        filter={null}
        onInputValueChange={countries.onInputValueChange}
      >
        <Combobox.InputGroup>
          <Combobox.Input placeholder="Search countries..." />
          <Combobox.Clear />
          <Combobox.Trigger />
        </Combobox.InputGroup>
        <Combobox.Content>
          <Combobox.List>
            {countries.items.map((country) => (
              <Combobox.Item key={country} value={country}>
                {country}
              </Combobox.Item>
            ))}
            <Combobox.Empty>
              {countries.loading ? "Loading..." : "No results. Start typing to search."}
            </Combobox.Empty>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
    </div>
  );
}

/** 5. Creatable Combobox (Single) */
function CreatableSingleCombobox() {
  const [tags, setTags] = useState<Tag[]>([
    { id: "1", name: "React" },
    { id: "2", name: "TypeScript" },
    { id: "3", name: "Tailwind" },
  ]);

  const creatable = Combobox.useCreatable({
    items: tags,
    getLabel: (tag) => tag.name,
    createItem: (value) => ({ id: crypto.randomUUID(), name: value }),
    onItemCreated: (item, resolve) => {
      setTags((prev) => [...prev, item]);
      resolve();
    },
  });

  return (
    <div style={{ maxWidth: "20rem" }}>
      <Combobox.Root
        items={creatable.items}
        value={creatable.value}
        onValueChange={creatable.onValueChange}
        inputValue={creatable.inputValue}
        onInputValueChange={creatable.onInputValueChange}
        itemToStringLabel={creatable.itemToStringLabel}
        itemToStringValue={creatable.itemToStringValue}
      >
        <Combobox.InputGroup>
          <Combobox.Input placeholder="Search or create a tag..." />
          <Combobox.Clear />
          <Combobox.Trigger />
        </Combobox.InputGroup>
        <Combobox.Content>
          <Combobox.List>
            {creatable.items.map((tag) => (
              <Combobox.Item key={creatable.isCreateItem(tag) ? "__create__" : tag.id} value={tag}>
                {creatable.isCreateItem(tag)
                  ? creatable.formatCreateLabel(creatable.getCreateLabel(tag) ?? "")
                  : tag.name}
              </Combobox.Item>
            ))}
            <Combobox.Empty>No results.</Combobox.Empty>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      {creatable.value && (
        <p
          style={{
            fontSize: "0.8125rem",
            marginTop: "0.5rem",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          Selected: <span style={code}>{creatable.value.name}</span>
        </p>
      )}
    </div>
  );
}

/** 6. Creatable Combobox (Multiple) */
function CreatableMultipleCombobox() {
  const [tags, setTags] = useState<Tag[]>([
    { id: "1", name: "Frontend" },
    { id: "2", name: "Backend" },
    { id: "3", name: "DevOps" },
    { id: "4", name: "Design" },
  ]);

  const creatable = Combobox.useCreatable({
    items: tags,
    multiple: true,
    getLabel: (tag) => tag.name,
    createItem: (value) => ({ id: crypto.randomUUID(), name: value }),
    onItemCreated: (item, resolve) => {
      setTags((prev) => [...prev, item]);
      resolve();
    },
  });

  return (
    <div style={{ maxWidth: "24rem" }}>
      <Combobox.Root<Tag, true>
        multiple
        items={creatable.items}
        value={creatable.value}
        onValueChange={creatable.onValueChange}
        inputValue={creatable.inputValue}
        onInputValueChange={creatable.onInputValueChange}
        itemToStringLabel={creatable.itemToStringLabel}
        itemToStringValue={creatable.itemToStringValue}
      >
        <Combobox.Chips>
          {creatable.value.map((tag) => (
            <Combobox.Chip key={tag.id}>
              {tag.name}
              <Combobox.ChipRemove />
            </Combobox.Chip>
          ))}
          <Combobox.Input placeholder="Search or create tags..." />
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.List>
            {creatable.items.map((tag) => (
              <Combobox.Item key={creatable.isCreateItem(tag) ? "__create__" : tag.id} value={tag}>
                {creatable.isCreateItem(tag)
                  ? creatable.formatCreateLabel(creatable.getCreateLabel(tag) ?? "")
                  : tag.name}
              </Combobox.Item>
            ))}
            <Combobox.Empty>No results.</Combobox.Empty>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
    </div>
  );
}

/** 7. Creatable with Async onItemCreated */
function CreatableAsyncCombobox() {
  const [tags, setTags] = useState<Tag[]>([
    { id: "1", name: "Bug" },
    { id: "2", name: "Feature" },
    { id: "3", name: "Enhancement" },
  ]);
  const [saving, setSaving] = useState(false);

  const creatable = Combobox.useCreatable({
    items: tags,
    getLabel: (tag) => tag.name,
    createItem: (value) => ({ id: crypto.randomUUID(), name: value }),
    onItemCreated: async (item: Tag) => {
      setSaving(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTags((prev) => [...prev, item]);
      setSaving(false);
    },
  });

  return (
    <div style={{ maxWidth: "20rem" }}>
      <Combobox.Root
        items={creatable.items}
        value={creatable.value}
        onValueChange={creatable.onValueChange}
        inputValue={creatable.inputValue}
        onInputValueChange={creatable.onInputValueChange}
        itemToStringLabel={creatable.itemToStringLabel}
        itemToStringValue={creatable.itemToStringValue}
      >
        <Combobox.InputGroup>
          <Combobox.Input placeholder="Search or create labels..." />
          <Combobox.Clear />
          <Combobox.Trigger />
        </Combobox.InputGroup>
        <Combobox.Content>
          <Combobox.List>
            {creatable.items.map((tag) => (
              <Combobox.Item key={creatable.isCreateItem(tag) ? "__create__" : tag.id} value={tag}>
                {creatable.isCreateItem(tag)
                  ? creatable.formatCreateLabel(creatable.getCreateLabel(tag) ?? "")
                  : tag.name}
              </Combobox.Item>
            ))}
            <Combobox.Empty>No results.</Combobox.Empty>
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      {saving && (
        <p
          style={{
            fontSize: "0.8125rem",
            marginTop: "0.5rem",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          Saving...
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const ComboboxShowcasePage = () => {
  return (
    <div style={{ padding: "1.5rem", maxWidth: "56rem", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "0.5rem",
        }}
      >
        Combobox Patterns
      </h1>
      <p style={{ marginBottom: "2rem", color: "hsl(var(--muted-foreground))" }}>
        Comprehensive showcase of <span style={code}>Combobox</span> patterns: basic, grouped,
        multiple, async, and creatable variants.
      </p>

      {/* 1. Basic */}
      <div style={section}>
        <h2 style={sectionTitle}>Basic</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Simple single-select combobox with client-side filtering.
        </p>
        <BasicCombobox />
      </div>

      {/* 2. Grouped */}
      <div style={section}>
        <h2 style={sectionTitle}>Grouped</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Items organised into labelled groups using <span style={code}>Combobox.Group</span> and{" "}
          <span style={code}>Combobox.GroupLabel</span>.
        </p>
        <GroupedCombobox />
      </div>

      {/* 3. Multiple */}
      <div style={section}>
        <h2 style={sectionTitle}>Multiple Selection</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Multi-select mode with chip display. Uses <span style={code}>Combobox.Chips</span>,{" "}
          <span style={code}>Combobox.Chip</span>, and <span style={code}>Combobox.ChipRemove</span>
          .
        </p>
        <MultipleCombobox />
      </div>

      {/* 4. Async */}
      <div style={section}>
        <h2 style={sectionTitle}>Async</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Server-side search with <span style={code}>Combobox.useAsync</span>. Includes debounce
          (300ms) and automatic request cancellation.
        </p>
        <AsyncCombobox />
      </div>

      {/* 5. Creatable (Single) */}
      <div style={section}>
        <h2 style={sectionTitle}>Creatable (Single)</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Users can create new items on-the-fly. Uses{" "}
          <span style={code}>Combobox.useCreatable</span> with sync{" "}
          <span style={code}>resolve()</span> callback.
        </p>
        <CreatableSingleCombobox />
      </div>

      {/* 6. Creatable (Multiple) */}
      <div style={section}>
        <h2 style={sectionTitle}>Creatable (Multiple)</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Multi-select creatable — combine chip display with on-the-fly creation.
        </p>
        <CreatableMultipleCombobox />
      </div>

      {/* 7. Creatable (Async) */}
      <div style={section}>
        <h2 style={sectionTitle}>Creatable (Async onItemCreated)</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Creatable where <span style={code}>onItemCreated</span> returns a Promise — simulates
          saving to an API. Item is auto-accepted on fulfilment.
        </p>
        <CreatableAsyncCombobox />
      </div>
    </div>
  );
};

ComboboxShowcasePage.appShellPageProps = {
  meta: {
    title: "Combobox Patterns",
  },
} satisfies AppShellPageProps;

export default ComboboxShowcasePage;
