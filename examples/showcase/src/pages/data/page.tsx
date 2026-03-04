import { Link } from "@tailor-platform/app-shell";

const DataPage = () => (
  <div style={{ padding: "1.5rem" }}>
    <h1
      style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
    >
      Data Display
    </h1>
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Link
        to="/data/table"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → Table
      </Link>
      <Link
        to="/data/description-card"
        style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
      >
        → DescriptionCard
      </Link>
    </div>
  </div>
);

export default DataPage;
