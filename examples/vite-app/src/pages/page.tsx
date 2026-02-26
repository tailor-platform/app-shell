import { Link } from "@tailor-platform/app-shell";
import { paths } from "../routes.generated";

const HomePage = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Welcome to App Shell
      </h1>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        This is the root page, defined at <code>src/pages/page.tsx</code>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link
          to={paths.for("/dashboard")}
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → Go to Dashboard
        </Link>
        <Link
          to={paths.for("/settings")}
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → Go to Settings
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
