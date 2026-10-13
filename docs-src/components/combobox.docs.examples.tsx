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
