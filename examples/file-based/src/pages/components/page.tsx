import { Link, type AppShellPageProps } from "@tailor-platform/app-shell";
import { LayoutIcon } from "shared-pages";

const ComponentsPage = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Component Showcase
      </h1>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        Explore AppShell UI components with live demos.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link
          to="/components/description-card"
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → DescriptionCard — Rich data display with various field types
        </Link>
        <Link
          to="/components/layout-1-column"
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → Layout (1 Column)
        </Link>
        <Link
          to="/components/layout-2-columns"
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → Layout (2 Columns) — With action buttons
        </Link>
        <Link
          to="/components/layout-3-columns"
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → Layout (3 Columns) — Responsive multi-column
        </Link>
      </div>
    </div>
  );
};

ComponentsPage.appShellPageProps = {
  meta: {
    title: "Components",
    icon: <LayoutIcon />,
  },
} satisfies AppShellPageProps;

export default ComponentsPage;
