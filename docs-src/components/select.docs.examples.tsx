import { Field, Select } from "@tailor-platform/app-shell";

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

export function WithField() {
  return (
    <Field.Root name="country">
      <Field.Label>Country</Field.Label>
      <Select items={["Japan", "United States"]} placeholder="Select a country" />
    </Field.Root>
  );
}
