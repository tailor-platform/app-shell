import { Autocomplete } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Autocomplete
      items={["Apple", "Banana", "Cherry"]}
      placeholder="Type a fruit..."
      onValueChange={(value) => console.log(value)}
    />
  );
}
