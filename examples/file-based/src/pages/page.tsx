import { Link } from "@tailor-platform/app-shell";
import { paths } from "../routes.generated";

const HomePage = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Project Manager
      </h1>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        Welcome to the file-based routing example. Navigate using the sidebar or
        the links below.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link
          to={paths.for("/projects")}
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → Projects
        </Link>
        <Link
          to={paths.for("/tasks")}
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → Tasks (Admin Only)
        </Link>
        <Link
          to={paths.for("/components/description-card")}
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          → Component Showcase
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
