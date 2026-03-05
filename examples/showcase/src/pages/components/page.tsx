import { Link } from "@tailor-platform/app-shell";

const ComponentsPage = () => (
  <div style={{ padding: "1.5rem" }}>
    <h1
      style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
    >
      Components
    </h1>
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Link
        to="/components/buttons-badges"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Button & Badge
      </Link>
      <Link
        to="/components/accordion-tabs"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Accordion & Tabs
      </Link>
      <Link
        to="/components/overlays"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Overlays
      </Link>
      <Link
        to="/components/avatar-separator"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Avatar & Separator
      </Link>
      <Link
        to="/components/progress-meter"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Progress & Meter
      </Link>
      <Link
        to="/components/toggle-toolbar"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Toggle & Toolbar
      </Link>
    </div>
  </div>
);

export default ComponentsPage;
