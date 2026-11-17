import { useState } from "react";
import { Combobox, Text, type ComboboxAsyncFetcher } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Combobox
      items={["Apple", "Banana", "Cherry"]}
      placeholder="Search fruits..."
      onValueChange={(value) => console.log(value)}
    />
  );
}

export function GroupedItems() {
  const fruits = [
    { label: "Citrus", items: ["Orange", "Lemon", "Lime"] },
    { label: "Berries", items: ["Strawberry", "Blueberry"] },
  ];

  return (
    <Combobox items={fruits} aria-label="Grouped fruit search" placeholder="Search fruits..." />
  );
}

export function MultiSelect() {
  return (
    <Combobox
      items={["Red", "Green", "Blue"]}
      multiple
      aria-label="Colors"
      placeholder="Pick colors"
      onValueChange={(colors) => console.log(colors)}
    />
  );
}

export function CreatableItems() {
  type Tag = { id: string; name: string };
  const [tags, setTags] = useState<Tag[]>([
    { id: "1", name: "Bug" },
    { id: "2", name: "Feature" },
  ]);
  const [selected, setSelected] = useState<Tag | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Combobox
        items={tags}
        mapItem={(tag) => ({ label: tag.name, key: tag.id })}
        value={selected}
        onValueChange={setSelected}
        onCreateItem={(name) => {
          const tag: Tag = { id: crypto.randomUUID(), name };
          setTags((previous) => [...previous, tag]);
          return tag;
        }}
        aria-label="Tag"
        placeholder="Search or create a tag..."
      />
      <Text.p>Selected tag: {selected?.name ?? "None"}</Text.p>
    </div>
  );
}

export function AsyncLoading() {
  type User = { id: string; name: string };
  const [users] = useState<User[]>([
    { id: "1", name: "Alex Rivera" },
    { id: "2", name: "Morgan Lee" },
    { id: "3", name: "Sam Taylor" },
  ]);
  const [selected, setSelected] = useState<User | null>(null);
  const fetcher: ComboboxAsyncFetcher<User> = async (query, { signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    signal.throwIfAborted();
    return users.filter((user) => user.name.toLowerCase().includes((query ?? "").toLowerCase()));
  };

  return (
    <div className="flex flex-col gap-3">
      <Combobox.Async
        fetcher={fetcher}
        mapItem={(user) => ({ label: user.name, key: user.id })}
        value={selected}
        onValueChange={setSelected}
        aria-label="User search"
        placeholder="Search users..."
        loadingText="Loading users..."
        emptyText="No users found."
      />
      <Text.p>Selected user: {selected?.name ?? "None"}</Text.p>
    </div>
  );
}

export function AccessibleName() {
  return <Combobox items={["Apple", "Banana", "Cherry"]} aria-label="Fruit filter" />;
}
