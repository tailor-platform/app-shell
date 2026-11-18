import { useRef, useState } from "react";
import {
  Autocomplete,
  Button,
  Field,
  Form,
  Text,
  type AutocompleteAsyncFetcher,
} from "@tailor-platform/app-shell";

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

export function AsyncSuggestions() {
  const [value, setValue] = useState("");
  const fetcher: AutocompleteAsyncFetcher<string> = async (query, { signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    signal.throwIfAborted();
    return ["Apple", "Apricot", "Banana", "Cherry"].filter((fruit) =>
      fruit.toLowerCase().includes((query ?? "").toLowerCase()),
    );
  };

  return (
    <div className="max-w-sm space-y-3">
      <Autocomplete.Async
        aria-label="Async fruit suggestions"
        fetcher={fetcher}
        value={value}
        onValueChange={setValue}
        placeholder="Type ap or ba..."
        loadingText="Finding fruit..."
        emptyText="No matching fruit."
      />
      <Text.p role="status">Current text: {value || "Empty"}</Text.p>
    </div>
  );
}

export function AddressSuggestions() {
  const [submitted, setSubmitted] = useState<{ address: string } | null>(null);
  const fetcher: AutocompleteAsyncFetcher<string> = async (query, { signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    signal.throwIfAborted();
    if (!query) return [];
    return ["10 Maple Street", "12 Maple Avenue", "20 Oak Road"].filter((address) =>
      address.toLowerCase().includes(query.toLowerCase()),
    );
  };

  return (
    <Form<{ address: string }>
      noValidate
      onFormSubmit={setSubmitted}
      className="max-w-sm space-y-3"
    >
      <Field.Root name="address">
        <Field.Label>Shipping address</Field.Label>
        <Autocomplete.Async fetcher={fetcher} placeholder="Type Maple or Oak..." required />
        <Field.Description>Choose a suggestion or enter your own address.</Field.Description>
        <Field.Error match="valueMissing">Enter an address.</Field.Error>
      </Field.Root>
      <Button type="submit">Use address</Button>
      <Text.p role="status">Submitted address: {submitted?.address ?? "None"}</Text.p>
    </Form>
  );
}

export function AsyncWithParts() {
  const failNext = useRef(true);
  const suggestions = Autocomplete.useAsync<string>({
    fetcher: async (query, { signal }) => {
      await new Promise((resolve) => setTimeout(resolve, 450));
      signal.throwIfAborted();
      if (failNext.current) {
        failNext.current = false;
        throw new Error("Simulated lookup failure");
      }
      return ["Tokyo", "Osaka", "Kyoto", "Kobe"].filter((city) =>
        city.toLowerCase().includes((query ?? "").toLowerCase()),
      );
    },
  });

  return (
    <div className="max-w-sm space-y-3">
      <Text.p>The first lookup fails locally. Retry the same search to recover.</Text.p>
      <Autocomplete.Parts.Root
        items={suggestions.items}
        value={suggestions.value}
        onValueChange={suggestions.onValueChange}
        filter={null}
      >
        <Autocomplete.Parts.InputGroup>
          <Autocomplete.Parts.Input
            aria-label="Custom async city search"
            placeholder="Type k or to..."
          />
          <Autocomplete.Parts.Clear />
          <Autocomplete.Parts.Trigger />
        </Autocomplete.Parts.InputGroup>
        <Autocomplete.Parts.Content>
          <Autocomplete.Parts.Empty>
            {suggestions.loading ? (
              "Finding cities..."
            ) : suggestions.error ? (
              <div className="space-y-2">
                <Text.p>Could not load cities.</Text.p>
                <Button type="button" size="sm" variant="outline" onClick={suggestions.retry}>
                  Retry city search
                </Button>
              </div>
            ) : (
              "No matching cities."
            )}
          </Autocomplete.Parts.Empty>
          <Autocomplete.Parts.List>
            {(city: string) => (
              <Autocomplete.Parts.Item key={city} value={city}>
                {city}
              </Autocomplete.Parts.Item>
            )}
          </Autocomplete.Parts.List>
        </Autocomplete.Parts.Content>
      </Autocomplete.Parts.Root>
      <Text.p role="status">
        {suggestions.loading
          ? "Loading cities..."
          : suggestions.error
            ? "Lookup failed; retry is available."
            : `Current text: ${suggestions.value || "Empty"}`}
      </Text.p>
    </div>
  );
}
