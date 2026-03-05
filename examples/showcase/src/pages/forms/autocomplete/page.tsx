import { Autocomplete } from "@tailor-platform/app-shell";
import {
  PageContainer,
  Section,
  fruits,
  produceGroups,
  type ProduceGroupItem,
} from "../../../shared";

interface Country {
  name: string;
  code: string;
  flag: string;
}

const AsyncAutocompleteDemo = () => {
  const countries = Autocomplete.useAsync<Country>({
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
    <Autocomplete.Root
      items={countries.items}
      value={countries.query}
      onValueChange={countries.onValueChange}
      filter={null}
      itemToStringValue={(country: Country) => country.name}
    >
      <Autocomplete.InputGroup>
        <Autocomplete.Input placeholder="Search countries..." />
        <Autocomplete.Clear />
        <Autocomplete.Trigger />
      </Autocomplete.InputGroup>
      <Autocomplete.Content>
        <Autocomplete.List>
          {(country: Country) => (
            <Autocomplete.Item key={country.code} value={country}>
              {country.flag} {country.name}
            </Autocomplete.Item>
          )}
        </Autocomplete.List>
        <Autocomplete.Empty>
          {countries.loading
            ? "Loading..."
            : countries.query
              ? "No results found."
              : "Type to search countries."}
        </Autocomplete.Empty>
        <Autocomplete.Status>
          {countries.loading
            ? "Loading results..."
            : countries.items.length > 0
              ? `${countries.items.length} results available.`
              : "Type to search countries."}
        </Autocomplete.Status>
      </Autocomplete.Content>
    </Autocomplete.Root>
  );
};

const AutocompletePage = () => {
  return (
    <PageContainer>
      <Section title="Autocomplete">
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
            <Autocomplete.Root items={fruits}>
              <Autocomplete.InputGroup>
                <Autocomplete.Input placeholder="Search fruits..." />
                <Autocomplete.Clear />
                <Autocomplete.Trigger />
              </Autocomplete.InputGroup>
              <Autocomplete.Content>
                <Autocomplete.List>
                  {(item: string) => (
                    <Autocomplete.Item value={item}>{item}</Autocomplete.Item>
                  )}
                </Autocomplete.List>
                <Autocomplete.Empty>No fruits found.</Autocomplete.Empty>
              </Autocomplete.Content>
            </Autocomplete.Root>
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
            <Autocomplete.Root items={produceGroups}>
              <Autocomplete.InputGroup>
                <Autocomplete.Input placeholder="Search produce..." />
                <Autocomplete.Clear />
                <Autocomplete.Trigger />
              </Autocomplete.InputGroup>
              <Autocomplete.Content>
                <Autocomplete.List>
                  {(group: ProduceGroupItem) => (
                    <Autocomplete.Group key={group.value} items={group.items}>
                      <Autocomplete.GroupLabel>
                        {group.value}
                      </Autocomplete.GroupLabel>
                      <Autocomplete.Collection>
                        {(item: string) => (
                          <Autocomplete.Item key={item} value={item}>
                            {item}
                          </Autocomplete.Item>
                        )}
                      </Autocomplete.Collection>
                    </Autocomplete.Group>
                  )}
                </Autocomplete.List>
                <Autocomplete.Empty>No produce found.</Autocomplete.Empty>
              </Autocomplete.Content>
            </Autocomplete.Root>
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
            <AsyncAutocompleteDemo />
          </div>
        </div>
      </Section>
    </PageContainer>
  );
};

export default AutocompletePage;
