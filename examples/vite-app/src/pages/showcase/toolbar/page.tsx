import { useState } from "react";
import {
  Button,
  Combobox,
  Input,
  Layout,
  Select,
  Tabs,
  Toolbar,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { SlidersHorizontal } from "lucide-react";

const ToolbarPage = () => {
  const [message, setMessage] = useState("Choose a toolbar action.");
  const [query, setQuery] = useState("");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [view, setView] = useState("all");

  return (
    <Layout>
      <Layout.Header title="Toolbar" />
      <Layout.Column>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          A generic control bar built from rows, groups, and separators. Focus a button and use the
          arrow keys, Home, or End to move within its row. Text inputs keep their native arrow-key
          behavior.
        </p>

        <div className="grid gap-8">
          <section className="grid gap-3">
            <h2 className="text-base font-semibold">Editor controls</h2>
            <Toolbar.Root>
              <Toolbar.Row justify="between" aria-label="Text formatting">
                <Toolbar.Group>
                  <Button
                    size="sm"
                    variant={bold ? "secondary" : "outline"}
                    aria-pressed={bold}
                    onClick={() => {
                      setBold((value) => !value);
                      setMessage("Toggled bold.");
                    }}
                  >
                    Bold
                  </Button>
                  <Button
                    size="sm"
                    variant={italic ? "secondary" : "outline"}
                    aria-pressed={italic}
                    onClick={() => {
                      setItalic((value) => !value);
                      setMessage("Toggled italic.");
                    }}
                  >
                    Italic
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMessage("Underlined text.")}
                  >
                    Underline
                  </Button>
                  <Toolbar.Separator />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMessage("Copied selection.")}
                  >
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMessage("Pasted clipboard.")}
                  >
                    Paste
                  </Button>
                </Toolbar.Group>

                <Toolbar.Group>
                  <Button size="sm" onClick={() => setMessage("Saved document.")}>
                    Save
                  </Button>
                </Toolbar.Group>
              </Toolbar.Row>
            </Toolbar.Root>
          </section>

          <section className="grid gap-3">
            <h2 className="text-base font-semibold">Multi-row list controls</h2>
            <Tabs.Root value={view} onValueChange={setView} variant="capsule" size="sm">
              <Toolbar.Root>
                <Toolbar.Row justify="between" aria-label="List actions">
                  <Toolbar.Group>
                    <Tabs.List aria-label="Order views">
                      <Tabs.Tab value="all">All</Tabs.Tab>
                      <Tabs.Tab value="open">Open</Tabs.Tab>
                      <Tabs.Tab value="closed">Closed</Tabs.Tab>
                    </Tabs.List>
                  </Toolbar.Group>

                  <Toolbar.Group>
                    <Button variant="outline" onClick={() => setMessage("Export started.")}>
                      Export
                    </Button>
                    <Button onClick={() => setMessage("Created order.")}>New order</Button>
                  </Toolbar.Group>
                </Toolbar.Row>

                <Toolbar.Row justify="between" aria-label="List filters">
                  <Toolbar.Group>
                    <div className="w-52">
                      <Input
                        aria-label="Search orders"
                        placeholder="Search orders"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>
                    <Combobox
                      aria-label="Assignee"
                      className="w-40"
                      items={["Ada Lovelace", "Grace Hopper", "Linus Torvalds"]}
                      placeholder="Assignee"
                    />
                    <Select
                      aria-label="Sort orders"
                      className="w-40"
                      items={["Newest first", "Oldest first", "Amount: high to low"]}
                      defaultValue="Newest first"
                    />
                  </Toolbar.Group>

                  <Toolbar.Group>
                    <Button variant="outline" onClick={() => setQuery("")}>
                      Clear
                    </Button>
                  </Toolbar.Group>
                </Toolbar.Row>

                <Toolbar.Row aria-label="Active list filters">
                  <Toolbar.Group>
                    <Button variant="secondary" onClick={() => setMessage("Status filter opened.")}>
                      Status: Open
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setMessage("Assignee filter opened.")}
                    >
                      Assignee: Me
                    </Button>
                  </Toolbar.Group>
                </Toolbar.Row>
              </Toolbar.Root>

              <Tabs.Panel value="all" className="text-sm text-muted-foreground">
                Showing all orders.
              </Tabs.Panel>
              <Tabs.Panel value="open" className="text-sm text-muted-foreground">
                Showing open orders.
              </Tabs.Panel>
              <Tabs.Panel value="closed" className="text-sm text-muted-foreground">
                Showing closed orders.
              </Tabs.Panel>
            </Tabs.Root>
          </section>

          <p aria-live="polite" className="text-sm text-muted-foreground">
            {message}
            {query && ` Searching for “${query}”.`}
          </p>
        </div>
      </Layout.Column>
    </Layout>
  );
};

ToolbarPage.appShellPageProps = {
  meta: {
    title: "Toolbar",
    icon: <SlidersHorizontal size={16} />,
  },
} satisfies AppShellPageProps;

export default ToolbarPage;
