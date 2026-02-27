import { Link, useParams, DescriptionCard } from "@tailor-platform/app-shell";
import type { SVGProps } from "react";

// ============================================================================
// Icons
// ============================================================================

export const FolderIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
};

// ============================================================================
// Mock Data
// ============================================================================

export const mockProjects = [
  {
    id: "proj-001",
    name: "Website Redesign",
    status: "IN_PROGRESS",
    priority: "HIGH",
    lead: "Alice Johnson",
    startDate: "2025-11-01T00:00:00Z",
    dueDate: "2026-03-31T00:00:00Z",
    description:
      "Complete overhaul of the company website with modern design patterns.",
    tasksTotal: 24,
    tasksCompleted: 12,
    budget: 45000,
    spent: 22500,
    currency: { code: "USD" },
    client: "Internal",
    department: "Engineering",
    tags: ["frontend", "design", "high-priority"],
  },
  {
    id: "proj-002",
    name: "Mobile App Launch",
    status: "PLANNING",
    priority: "MEDIUM",
    lead: "Bob Smith",
    startDate: "2026-01-15T00:00:00Z",
    dueDate: "2026-06-30T00:00:00Z",
    description: "Build and launch a cross-platform mobile application.",
    tasksTotal: 40,
    tasksCompleted: 5,
    budget: 80000,
    spent: 8000,
    currency: { code: "USD" },
    client: "Acme Corp",
    department: "Product",
    tags: ["mobile", "react-native"],
  },
  {
    id: "proj-003",
    name: "API Migration",
    status: "COMPLETED",
    priority: "LOW",
    lead: "Carol Davis",
    startDate: "2025-08-01T00:00:00Z",
    dueDate: "2025-12-15T00:00:00Z",
    description: "Migrate legacy REST APIs to GraphQL.",
    tasksTotal: 18,
    tasksCompleted: 18,
    budget: 30000,
    spent: 28500,
    currency: { code: "USD" },
    client: "Internal",
    department: "Engineering",
    tags: ["backend", "graphql"],
  },
];

// ============================================================================
// Project List Page
// ============================================================================

/**
 * Renders a list of projects with links to detail pages.
 * @param linkTo - Function to generate the link URL for a project ID.
 */
export const ProjectListPage = ({
  linkTo,
}: {
  linkTo: (id: string) => string;
}) => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Projects
      </h1>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        Manage your projects and track progress.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {mockProjects.map((project) => (
          <Link
            key={project.id}
            to={linkTo(project.id)}
            style={{
              display: "block",
              padding: "0.75rem 1rem",
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "0.5rem",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>{project.name}</strong>
              <span
                style={{
                  color: "hsl(var(--muted-foreground))",
                  fontSize: "0.875rem",
                }}
              >
                {project.status.replace("_", " ")} · {project.tasksCompleted}/
                {project.tasksTotal} tasks
              </span>
            </div>
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "0.875rem",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              {project.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Project Detail Page
// ============================================================================

/**
 * Renders a project detail page with DescriptionCard.
 * @param backTo - URL to navigate back to the project list.
 */
export const ProjectDetailPage = ({ backTo }: { backTo: string }) => {
  const { id } = useParams<{ id: string }>();
  const project = mockProjects.find((p) => p.id === id) ?? mockProjects[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.5rem",
      }}
    >
      <div>
        <Link
          to={backTo}
          style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
        >
          ← Back to Projects
        </Link>
      </div>

      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{project.name}</h1>

      {/* Status Overview */}
      <DescriptionCard
        data={project}
        title="Status Overview"
        columns={4}
        fields={[
          {
            key: "status",
            label: "Status",
            type: "badge",
            meta: {
              badgeVariantMap: {
                PLANNING: "outline-neutral",
                IN_PROGRESS: "success",
                COMPLETED: "outline-success",
                ON_HOLD: "outline-warning",
              },
            },
          },
          {
            key: "priority",
            label: "Priority",
            type: "badge",
            meta: {
              badgeVariantMap: {
                HIGH: "warning",
                MEDIUM: "neutral",
                LOW: "outline-neutral",
              },
            },
          },
          { key: "lead", label: "Project Lead" },
          { key: "department", label: "Department" },
        ]}
      />

      {/* Project Details */}
      <DescriptionCard
        data={project}
        title="Project Details"
        columns={4}
        fields={[
          { key: "id", label: "Project ID", meta: { copyable: true } },
          { key: "client", label: "Client" },
          {
            key: "description",
            label: "Description",
            meta: { truncateLines: 2 },
          },
          { type: "divider" },
          {
            key: "startDate",
            label: "Start Date",
            type: "date",
            meta: { dateFormat: "medium" },
          },
          {
            key: "dueDate",
            label: "Due Date",
            type: "date",
            meta: { dateFormat: "medium" },
          },
          { key: "tasksCompleted", label: "Tasks Done" },
          { key: "tasksTotal", label: "Tasks Total" },
        ]}
      />

      {/* Budget */}
      <DescriptionCard
        data={project}
        title="Budget"
        columns={4}
        fields={[
          {
            key: "budget",
            label: "Budget",
            type: "money",
            meta: { currencyKey: "currency.code" },
          },
          {
            key: "spent",
            label: "Spent",
            type: "money",
            meta: { currencyKey: "currency.code" },
          },
          { key: "currency.code", label: "Currency" },
        ]}
      />
    </div>
  );
};
