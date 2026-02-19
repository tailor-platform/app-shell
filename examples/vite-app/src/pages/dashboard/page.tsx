import { Link, type AppShellPageProps } from "@tailor-platform/app-shell";
import { paths } from "../../routes.generated";

const ZapIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 14a1 1 0 0 1-.8-1.6l9-11A1 1 0 0 1 14 2v7h6a1 1 0 0 1 .8 1.6l-9 11A1 1 0 0 1 10 22v-7z" />
  </svg>
);

const DashboardPage = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Dashboard
      </h1>
      <p style={{ marginBottom: "1rem" }}>
        Welcome to the file-based routing demo! This page is located at{" "}
        <code
          style={{
            backgroundColor: "hsl(var(--muted))",
            padding: "0.125rem 0.5rem",
            borderRadius: "0.25rem",
          }}
        >
          src/pages/dashboard/page.tsx
        </code>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p>
          <Link
            to={paths.for("/dashboard/orders")}
            style={{
              color: "hsl(var(--primary))",
              textDecoration: "underline",
            }}
          >
            → View Orders
          </Link>
        </p>
        <p>
          <Link
            to={paths.for("/settings")}
            style={{
              color: "hsl(var(--primary))",
              textDecoration: "underline",
            }}
          >
            → Go to Settings
          </Link>
        </p>
      </div>
    </div>
  );
};

DashboardPage.appShellPageProps = {
  meta: {
    title: "Dashboard",
    icon: <ZapIcon />,
  },
} satisfies AppShellPageProps;

export default DashboardPage;
