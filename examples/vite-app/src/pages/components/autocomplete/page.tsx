import type { AppShellPageProps } from "@tailor-platform/app-shell";
import { Autocomplete } from "@tailor-platform/app-shell";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const section: React.CSSProperties = {
  marginBottom: "2.5rem",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  marginBottom: "0.75rem",
  borderBottom: "1px solid hsl(var(--border))",
  paddingBottom: "0.5rem",
};

const code: React.CSSProperties = {
  fontSize: "0.75rem",
  backgroundColor: "hsl(var(--muted))",
  padding: "0.125rem 0.375rem",
  borderRadius: "0.25rem",
  fontFamily: "monospace",
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const fruits = [
  "Apple",
  "Banana",
  "Cherry",
  "Date",
  "Elderberry",
  "Fig",
  "Grape",
  "Honeydew",
  "Kiwi",
  "Lemon",
];

const programmingLanguages = [
  "C",
  "C++",
  "C#",
  "Clojure",
  "Dart",
  "Elixir",
  "Go",
  "Haskell",
  "Java",
  "JavaScript",
  "Kotlin",
  "Lua",
  "OCaml",
  "PHP",
  "Python",
  "Ruby",
  "Rust",
  "Scala",
  "Swift",
  "TypeScript",
  "Zig",
];

// ---------------------------------------------------------------------------
// Fake async fetcher
// ---------------------------------------------------------------------------
const fakeMovieFetcher = async (query: string, { signal }: { signal: AbortSignal }) => {
  const movies = [
    "The Shawshank Redemption",
    "The Godfather",
    "The Dark Knight",
    "Pulp Fiction",
    "Forrest Gump",
    "Inception",
    "The Matrix",
    "Interstellar",
    "Parasite",
    "Fight Club",
    "The Lord of the Rings",
    "Spirited Away",
    "Goodfellas",
    "The Silence of the Lambs",
    "Schindler's List",
    "Se7en",
    "The Departed",
    "Gladiator",
    "Whiplash",
    "The Prestige",
  ];
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 400);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
  if (!query.trim()) return [];
  return movies.filter((m) => m.toLowerCase().includes(query.toLowerCase()));
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** 1. Basic Autocomplete */
function BasicAutocomplete() {
  return (
    <div style={{ maxWidth: "20rem" }}>
      <Autocomplete.Root>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder="Type a fruit..." />
          <Autocomplete.Clear />
          <Autocomplete.Trigger />
        </Autocomplete.InputGroup>
        <Autocomplete.Content>
          <Autocomplete.List>
            {fruits.map((f) => (
              <Autocomplete.Item key={f} value={f}>
                {f}
              </Autocomplete.Item>
            ))}
            <Autocomplete.Empty>No suggestions.</Autocomplete.Empty>
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>
    </div>
  );
}

/** 2. Grouped Autocomplete */
function GroupedAutocomplete() {
  return (
    <div style={{ maxWidth: "20rem" }}>
      <Autocomplete.Root>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder="Search languages..." />
          <Autocomplete.Clear />
          <Autocomplete.Trigger />
        </Autocomplete.InputGroup>
        <Autocomplete.Content>
          <Autocomplete.List>
            <Autocomplete.Group>
              <Autocomplete.GroupLabel>Popular</Autocomplete.GroupLabel>
              {["JavaScript", "TypeScript", "Python", "Go", "Rust"].map((lang) => (
                <Autocomplete.Item key={lang} value={lang}>
                  {lang}
                </Autocomplete.Item>
              ))}
            </Autocomplete.Group>
            <Autocomplete.Group>
              <Autocomplete.GroupLabel>Others</Autocomplete.GroupLabel>
              {programmingLanguages
                .filter((l) => !["JavaScript", "TypeScript", "Python", "Go", "Rust"].includes(l))
                .map((lang) => (
                  <Autocomplete.Item key={lang} value={lang}>
                    {lang}
                  </Autocomplete.Item>
                ))}
            </Autocomplete.Group>
            <Autocomplete.Empty>No suggestions.</Autocomplete.Empty>
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>
    </div>
  );
}

/** 3. Autocomplete with custom filter */
function CustomFilterAutocomplete() {
  const filter = Autocomplete.useFilter({ sensitivity: "base" });

  return (
    <div style={{ maxWidth: "20rem" }}>
      <Autocomplete.Root filter={filter.contains}>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder="Case-insensitive search..." />
          <Autocomplete.Clear />
          <Autocomplete.Trigger />
        </Autocomplete.InputGroup>
        <Autocomplete.Content>
          <Autocomplete.List>
            {fruits.map((f) => (
              <Autocomplete.Item key={f} value={f}>
                {f}
              </Autocomplete.Item>
            ))}
            <Autocomplete.Empty>No suggestions.</Autocomplete.Empty>
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>
    </div>
  );
}

/** 4. Async Autocomplete */
function AsyncAutocomplete() {
  const movies = Autocomplete.useAsync({
    fetcher: fakeMovieFetcher,
    debounceMs: 300,
  });

  return (
    <div style={{ maxWidth: "20rem" }}>
      <Autocomplete.Root
        items={movies.items}
        value={movies.value}
        onValueChange={movies.onValueChange}
        filter={null}
      >
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder="Search movies..." />
          <Autocomplete.Clear />
          <Autocomplete.Trigger />
        </Autocomplete.InputGroup>
        <Autocomplete.Content>
          <Autocomplete.List>
            {movies.items.map((movie) => (
              <Autocomplete.Item key={movie} value={movie}>
                {movie}
              </Autocomplete.Item>
            ))}
            <Autocomplete.Empty>
              {movies.loading ? "Loading..." : "No results. Start typing to search."}
            </Autocomplete.Empty>
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>
    </div>
  );
}

/** 5. Free-form Autocomplete (highlights that value = input text) */
function FreeFormAutocomplete() {
  return (
    <div style={{ maxWidth: "20rem" }}>
      <Autocomplete.Root>
        <Autocomplete.InputGroup>
          <Autocomplete.Input placeholder="Type anything or pick a suggestion..." />
          <Autocomplete.Clear />
          <Autocomplete.Trigger />
        </Autocomplete.InputGroup>
        <Autocomplete.Content>
          <Autocomplete.List>
            {fruits.map((f) => (
              <Autocomplete.Item key={f} value={f}>
                {f}
              </Autocomplete.Item>
            ))}
            <Autocomplete.Empty>
              No suggestions — your typed value is still kept.
            </Autocomplete.Empty>
          </Autocomplete.List>
        </Autocomplete.Content>
      </Autocomplete.Root>
      <p
        style={{
          fontSize: "0.75rem",
          color: "hsl(var(--muted-foreground))",
          marginTop: "0.5rem",
        }}
      >
        Unlike Combobox, Autocomplete keeps free-form text as its value.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const AutocompleteShowcasePage = () => {
  return (
    <div style={{ padding: "1.5rem", maxWidth: "56rem", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "0.5rem",
        }}
      >
        Autocomplete Patterns
      </h1>
      <p style={{ marginBottom: "2rem", color: "hsl(var(--muted-foreground))" }}>
        Comprehensive showcase of <span style={code}>Autocomplete</span> patterns. Unlike Combobox,
        Autocomplete's value is always the input text (free-form), not a structured item.
      </p>

      {/* 1. Basic */}
      <div style={section}>
        <h2 style={sectionTitle}>Basic</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Simple autocomplete with client-side filtering. Value is the text in the input.
        </p>
        <BasicAutocomplete />
      </div>

      {/* 2. Grouped */}
      <div style={section}>
        <h2 style={sectionTitle}>Grouped</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Suggestions organised into labelled groups using{" "}
          <span style={code}>Autocomplete.Group</span> and{" "}
          <span style={code}>Autocomplete.GroupLabel</span>.
        </p>
        <GroupedAutocomplete />
      </div>

      {/* 3. Custom Filter */}
      <div style={section}>
        <h2 style={sectionTitle}>Custom Filter (useFilter)</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Uses <span style={code}>Autocomplete.useFilter</span> with{" "}
          <span style={code}>{'{ sensitivity: "base" }'}</span> for locale-aware case-insensitive
          matching.
        </p>
        <CustomFilterAutocomplete />
      </div>

      {/* 4. Async */}
      <div style={section}>
        <h2 style={sectionTitle}>Async</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Server-side search with <span style={code}>Autocomplete.useAsync</span>. Passes{" "}
          <span style={code}>value</span> and <span style={code}>onValueChange</span> (not{" "}
          <span style={code}>onInputValueChange</span>) since Autocomplete's value IS the input
          text.
        </p>
        <AsyncAutocomplete />
      </div>

      {/* 5. Free-form */}
      <div style={section}>
        <h2 style={sectionTitle}>Free-form Text</h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "0.75rem",
          }}
        >
          Demonstrates the key difference from Combobox: users can type arbitrary text. The
          suggestions are hints, not a closed set.
        </p>
        <FreeFormAutocomplete />
      </div>
    </div>
  );
};

AutocompleteShowcasePage.appShellPageProps = {
  meta: {
    title: "Autocomplete Patterns",
  },
} satisfies AppShellPageProps;

export default AutocompleteShowcasePage;
