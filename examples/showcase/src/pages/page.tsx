import { Link } from "@tailor-platform/app-shell";

const HomePage = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Components Showcase
      </h1>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        Browse all AppShell UI components. Use the sidebar to navigate between
        component categories.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        {[
          {
            title: "Button & Badge",
            path: "/components/buttons-badges",
            desc: "Buttons, badges, and variants",
          },
          {
            title: "Accordion & Tabs",
            path: "/components/accordion-tabs",
            desc: "Expandable and tabbed content",
          },
          {
            title: "Overlays",
            path: "/components/overlays",
            desc: "Dialog, Sheet, Popover, Tooltip",
          },
          {
            title: "Form Controls",
            path: "/forms/fields",
            desc: "Field, Fieldset, Form, Input",
          },
          {
            title: "Select",
            path: "/forms/select",
            desc: "Single, multiple, object value",
          },
          {
            title: "Combobox",
            path: "/forms/combobox",
            desc: "Searchable, async, creatable",
          },
          {
            title: "Autocomplete",
            path: "/forms/autocomplete",
            desc: "Basic, grouped, async",
          },
          {
            title: "Table",
            path: "/data/table",
            desc: "Data table with scroll area",
          },
          {
            title: "DescriptionCard",
            path: "/data/description-card",
            desc: "Structured data display",
          },
          {
            title: "Layout Columns",
            path: "/layout/columns",
            desc: "Multi-column layout system",
          },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              className="astw:rounded-lg astw:border astw:border-border astw:bg-card astw:p-4 astw:hover:bg-accent astw:transition-colors"
              style={{ cursor: "pointer" }}
            >
              <h3
                className="astw:text-sm astw:font-semibold astw:text-foreground"
                style={{ marginBottom: "0.25rem" }}
              >
                {item.title}
              </h3>
              <p className="astw:text-xs astw:text-muted-foreground">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
