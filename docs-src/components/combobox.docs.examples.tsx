import { Combobox } from "@tailor-platform/app-shell";

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

export function AccessibleName() {
  return <Combobox items={["Apple", "Banana", "Cherry"]} aria-label="Fruit filter" />;
}
