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

export function GroupedSuggestions() {
  const cities = [
    { label: "Japan", items: ["Tokyo", "Osaka", "Kyoto"] },
    { label: "France", items: ["Paris", "Lyon", "Marseille"] },
  ];

  return (
    <Autocomplete items={cities} aria-label="Grouped city search" placeholder="Search cities..." />
  );
}

export function ObjectItems() {
  type City = { code: string; name: string };
  const cities: City[] = [
    { code: "TYO", name: "Tokyo" },
    { code: "OSA", name: "Osaka" },
  ];

  return (
    <Autocomplete
      items={cities}
      mapItem={(city) => ({ label: city.name, key: city.code })}
      aria-label="City name"
      placeholder="Search cities..."
      onValueChange={(name) => console.log(name)}
    />
  );
}

export function AccessibleName() {
  return <Autocomplete items={["Tokyo", "Osaka", "Kyoto"]} aria-label="City search" />;
}
