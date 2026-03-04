import { useState, Fragment } from "react";
import {
  Combobox,
  Button,
  Dialog,
  Input,
} from "@tailor-platform/app-shell";
import {
  Section,
  frameworks,
  frameworkGroups,
  programmingLanguages,
  initialLabels,
  type ProduceGroupItem,
  type LabelItem,
} from "../../../shared";

// ============================================================================
// Combobox Pattern Demos
// ============================================================================

const MultipleComboboxDemo = () => {
  return (
    <Combobox.Root items={programmingLanguages} multiple>
      <Combobox.Chips>
        <Combobox.Value>
          {(value: string[]) => (
            <Fragment>
              {value.map((lang) => (
                <Combobox.Chip key={lang} aria-label={lang}>
                  {lang}
                  <Combobox.ChipRemove aria-label="Remove" />
                </Combobox.Chip>
              ))}
              <Combobox.Input
                placeholder={value.length > 0 ? "" : "Select languages..."}
              />
            </Fragment>
          )}
        </Combobox.Value>
      </Combobox.Chips>
      <Combobox.Content>
        <Combobox.List>
          {(item: string) => <Combobox.Item value={item}>{item}</Combobox.Item>}
        </Combobox.List>
        <Combobox.Empty>No languages found.</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
};

interface Country {
  name: string;
  code: string;
  flag: string;
}

const AsyncComboboxDemo = () => {
  const countries = Combobox.useAsync<Country>({
    fetcher: async (query, { signal }) => {
      const res = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(query)}?fields=name,cca2,flag`,
        { signal },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as {
        name: { common: string };
        cca2: string;
        flag: string;
      }[];
      return data.map((c) => ({
        name: c.name.common,
        code: c.cca2,
        flag: c.flag,
      }));
    },
    debounceMs: 300,
  });

  return (
    <Combobox.Root
      items={countries.items}
      filter={null}
      onInputValueChange={countries.onInputValueChange}
      itemToStringLabel={(country: Country) =>
        `${country.flag} ${country.name}`
      }
    >
      <Combobox.InputGroup>
        <Combobox.Input placeholder="Search countries..." />
        <Combobox.Clear />
        <Combobox.Trigger />
      </Combobox.InputGroup>
      <Combobox.Content>
        <Combobox.List>
          {(country: Country) => (
            <Combobox.Item key={country.code} value={country}>
              {country.flag} {country.name}
            </Combobox.Item>
          )}
        </Combobox.List>
        <Combobox.Empty>
          {countries.loading
            ? "Loading..."
            : countries.query
              ? "No results found."
              : "Type to search countries."}
        </Combobox.Empty>
        <Combobox.Status>
          {countries.loading
            ? "Loading results..."
            : "Type to search countries."}
        </Combobox.Status>
      </Combobox.Content>
    </Combobox.Root>
  );
};

const CreatableComboboxDemo = () => {
  const [labels, setLabels] = useState<LabelItem[]>(initialLabels);
  const [dialogState, setDialogState] = useState<{
    item: LabelItem;
    resolve: (accept?: boolean) => void;
  } | null>(null);
  const createInputRef = { current: null as HTMLInputElement | null };

  const creatable = Combobox.useCreatable({
    items: labels,
    multiple: true,
    getLabel: (item) => item.value,
    createItem: (value) => ({
      id: value.toLocaleLowerCase().replace(/\s+/g, "-"),
      value,
    }),
    onItemCreated: (item, resolve) => {
      setDialogState({ item, resolve });
    },
    formatCreateLabel: (value) => `Create "${value}"`,
  });

  return (
    <Fragment>
      <Combobox.Root
        items={creatable.items}
        multiple
        value={creatable.value}
        onValueChange={creatable.onValueChange}
        inputValue={creatable.inputValue}
        onInputValueChange={creatable.onInputValueChange}
      >
        <Combobox.Chips>
          <Combobox.Value>
            {(value: LabelItem[]) => (
              <Fragment>
                {value.map((label) => (
                  <Combobox.Chip key={label.id} aria-label={label.value}>
                    {label.value}
                    <Combobox.ChipRemove aria-label="Remove" />
                  </Combobox.Chip>
                ))}
                <Combobox.Input
                  placeholder={value.length > 0 ? "" : "Add labels..."}
                />
              </Fragment>
            )}
          </Combobox.Value>
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.List>
            {(item: LabelItem) => (
              <Combobox.Item key={item.id} value={item}>
                {creatable.isCreateItem(item)
                  ? `+ ${creatable.formatCreateLabel(creatable.getCreateLabel(item)!)}`
                  : item.value}
              </Combobox.Item>
            )}
          </Combobox.List>
          <Combobox.Empty>No labels found.</Combobox.Empty>
        </Combobox.Content>
      </Combobox.Root>

      <Dialog.Root
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) {
            dialogState?.resolve(false);
            setDialogState(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Create new label</Dialog.Title>
            <Dialog.Description>Add a new label to select.</Dialog.Description>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const value = createInputRef.current?.value.trim();
                if (value && dialogState) {
                  setLabels((prev) => [
                    ...prev,
                    { ...dialogState.item, value },
                  ]);
                  dialogState.resolve();
                  setDialogState(null);
                }
              }}
            >
              <Input
                ref={createInputRef}
                placeholder="Label name"
                defaultValue={dialogState?.item.value ?? ""}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  marginTop: "1rem",
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    dialogState?.resolve(false);
                    setDialogState(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Fragment>
  );
};

// ============================================================================
// Combobox Page
// ============================================================================

const ComboboxPage = () => {
  return (
    <div
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <Section title="Combobox">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Basic
            </span>
            <Combobox.Root items={frameworks}>
              <Combobox.InputGroup>
                <Combobox.Input placeholder="Select a framework..." />
                <Combobox.Clear />
                <Combobox.Trigger />
              </Combobox.InputGroup>
              <Combobox.Content>
                <Combobox.List>
                  {(item: string) => (
                    <Combobox.Item value={item}>{item}</Combobox.Item>
                  )}
                </Combobox.List>
                <Combobox.Empty>No framework found.</Combobox.Empty>
              </Combobox.Content>
            </Combobox.Root>
          </div>

          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Grouped
            </span>
            <Combobox.Root items={frameworkGroups}>
              <Combobox.InputGroup>
                <Combobox.Input placeholder="Select a framework..." />
                <Combobox.Clear />
                <Combobox.Trigger />
              </Combobox.InputGroup>
              <Combobox.Content>
                <Combobox.List>
                  {(group: ProduceGroupItem) => (
                    <Combobox.Group key={group.value} items={group.items}>
                      <Combobox.GroupLabel>{group.value}</Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(item: string) => (
                          <Combobox.Item key={item} value={item}>
                            {item}
                          </Combobox.Item>
                        )}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )}
                </Combobox.List>
                <Combobox.Empty>No framework found.</Combobox.Empty>
              </Combobox.Content>
            </Combobox.Root>
          </div>

          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Multiple Select
            </span>
            <MultipleComboboxDemo />
          </div>

          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Creatable
            </span>
            <CreatableComboboxDemo />
          </div>

          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Async (REST Countries API)
            </span>
            <AsyncComboboxDemo />
          </div>
        </div>
      </Section>
    </div>
  );
};

export default ComboboxPage;
