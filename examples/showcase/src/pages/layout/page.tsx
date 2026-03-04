import { Link } from "@tailor-platform/app-shell";

const LayoutPage = () => (
  <div style={{ padding: "1.5rem" }}>
    <h1
      style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
    >
      Layout
    </h1>
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Link
        to="/layout/columns"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Layout Columns
      </Link>
    </div>
  </div>
);

export default LayoutPage;
