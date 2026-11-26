import { useRef, useState } from "react";
import { Button, Field, Select, Text, type SelectAsyncFetcher } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Select
      items={["Apple", "Banana", "Cherry"]}
      placeholder="Pick a fruit"
      onValueChange={(value) => console.log(value)}
    />
  );
}

export function GroupedItems() {
  const fruits = [
    { label: "Citrus", items: ["Orange", "Lemon", "Lime"] },
    { label: "Berries", items: ["Strawberry", "Blueberry"] },
  ];

  return <Select items={fruits} aria-label="Grouped fruits" placeholder="Pick a fruit" />;
}

export function ObjectItems() {
  type Fruit = { id: number; name: string };
  const fruits: Fruit[] = [
    { id: 1, name: "Apple" },
    { id: 2, name: "Banana" },
  ];

  return (
    <Select
      items={fruits}
      mapItem={(fruit) => ({ label: fruit.name, key: String(fruit.id) })}
      aria-label="Fruit"
      placeholder="Pick a fruit"
      onValueChange={(fruit) => console.log(fruit?.id)}
    />
  );
}

export function MultiSelect() {
  return (
    <Select
      items={["Red", "Green", "Blue"]}
      multiple
      aria-label="Colors"
      placeholder="Pick colors"
      onValueChange={(colors) => console.log(colors)}
    />
  );
}

export function AsyncLoading() {
  type Fruit = { id: number; name: string };
  const [fruits] = useState<Fruit[]>([
    { id: 1, name: "Apple" },
    { id: 2, name: "Banana" },
    { id: 3, name: "Cherry" },
  ]);
  const [selected, setSelected] = useState<Fruit | null>(null);
  const fetcher: SelectAsyncFetcher<Fruit> = async ({ signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    signal.throwIfAborted();
    return fruits;
  };

  return (
    <div className="flex flex-col gap-3">
      <Select.Async
        fetcher={fetcher}
        mapItem={(fruit) => ({ label: fruit.name, key: String(fruit.id) })}
        value={selected}
        onValueChange={setSelected}
        aria-label="Async fruit"
        placeholder="Pick a fruit"
        loadingText="Loading fruits..."
      />
      <Text.p>Selected fruit: {selected?.name ?? "None"}</Text.p>
    </div>
  );
}

export function AsyncWithParts() {
  type Fruit = { id: number; name: string };
  const attempts = useRef(0);
  const [items] = useState<Fruit[]>([
    { id: 1, name: "Apple" },
    { id: 2, name: "Banana" },
    { id: 3, name: "Cherry" },
  ]);
  const [selected, setSelected] = useState<Fruit | null>(null);
  const fruits = Select.useAsync({
    fetcher: async ({ signal }) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      signal.throwIfAborted();
      if (attempts.current++ === 0) throw new Error("The first demo request fails.");
      return items;
    },
  });

  return (
    <div className="space-y-3">
      <Select.Parts.Root<Fruit>
        modal={false}
        value={selected}
        onValueChange={setSelected}
        onOpenChange={fruits.onOpenChange}
        itemToStringLabel={(fruit) => fruit.name}
      >
        <Select.Parts.Trigger aria-label="Fruit with custom async loading">
          <Select.Parts.Value placeholder="Pick a fruit" />
        </Select.Parts.Trigger>
        <Select.Parts.Content alignItemWithTrigger={false}>
          {fruits.loading ? (
            <div className="px-4 py-2 text-sm" role="status">
              Loading fruits...
            </div>
          ) : fruits.error ? (
            <div className="space-y-2 px-4 py-2">
              <Text.p role="alert">Couldn't load fruits. The first demo request fails.</Text.p>
              <Button
                type="button"
                variant="outline"
                // Keep trigger focus so clicking Retry does not close the popup.
                onMouseDown={(event) => event.preventDefault()}
                onClick={fruits.retry}
              >
                Retry
              </Button>
            </div>
          ) : (
            fruits.items.map((fruit) => (
              <Select.Parts.Item key={fruit.id} value={fruit}>
                {fruit.name}
              </Select.Parts.Item>
            ))
          )}
        </Select.Parts.Content>
      </Select.Parts.Root>
      <Text.p role="status">Selected fruit: {selected?.name ?? "None"}</Text.p>
    </div>
  );
}

export function WithField() {
  return (
    <Field.Root name="country">
      <Field.Label>Country</Field.Label>
      <Select items={["Japan", "United States"]} placeholder="Select a country" />
    </Field.Root>
  );
}
