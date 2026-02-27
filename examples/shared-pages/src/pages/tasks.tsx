import type { SVGProps } from "react";

// ============================================================================
// Icons
// ============================================================================

export const CheckSquareIcon = (props: SVGProps<SVGSVGElement>) => {
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
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
};

export const ShieldIcon = (props: SVGProps<SVGSVGElement>) => {
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
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
};

// ============================================================================
// Mock Data
// ============================================================================

const mockTasks = [
  {
    id: "task-001",
    title: "Design landing page mockup",
    project: "Website Redesign",
    assignee: "Alice Johnson",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: "2026-03-15",
  },
  {
    id: "task-002",
    title: "Set up CI/CD pipeline",
    project: "Mobile App Launch",
    assignee: "Bob Smith",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "2026-02-28",
  },
  {
    id: "task-003",
    title: "Write API documentation",
    project: "API Migration",
    assignee: "Carol Davis",
    status: "COMPLETED",
    priority: "LOW",
    dueDate: "2025-12-01",
  },
  {
    id: "task-004",
    title: "Review pull requests",
    project: "Website Redesign",
    assignee: "Alice Johnson",
    status: "TODO",
    priority: "HIGH",
    dueDate: "2026-03-01",
  },
  {
    id: "task-005",
    title: "Update dependencies",
    project: "Mobile App Launch",
    assignee: "Bob Smith",
    status: "IN_PROGRESS",
    priority: "LOW",
    dueDate: "2026-02-20",
  },
];

// ============================================================================
// Task List Page
// ============================================================================

/**
 * Task list page. Visible only to admin users (guard applied at route level).
 */
export const TaskListPage = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <ShieldIcon
          style={{
            width: "20px",
            height: "20px",
            color: "hsl(var(--primary))",
          }}
        />
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Tasks</h1>
        <span
          style={{
            fontSize: "0.75rem",
            padding: "0.125rem 0.5rem",
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            borderRadius: "9999px",
          }}
        >
          Admin Only
        </span>
      </div>
      <p
        style={{
          marginBottom: "1.5rem",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        View and manage tasks across all projects. This page is only accessible
        to admin users.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {mockTasks.map((task) => (
          <div
            key={task.id}
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "0.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{task.title}</strong>
              <p
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.875rem",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                {task.project} · {task.assignee}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                fontSize: "0.75rem",
              }}
            >
              <span
                style={{
                  padding: "0.125rem 0.5rem",
                  borderRadius: "0.25rem",
                  backgroundColor:
                    task.status === "COMPLETED"
                      ? "hsl(142 76% 36% / 0.1)"
                      : task.status === "IN_PROGRESS"
                        ? "hsl(48 96% 53% / 0.1)"
                        : "hsl(var(--muted))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                {task.status.replace("_", " ")}
              </span>
              <span style={{ color: "hsl(var(--muted-foreground))" }}>
                Due: {task.dueDate}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "hsl(var(--muted))",
          borderRadius: "0.5rem",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          How Guards Work:
        </h2>
        <ul
          style={{
            listStyle: "disc",
            paddingLeft: "1.5rem",
            lineHeight: "1.75",
            fontSize: "0.875rem",
          }}
        >
          <li>
            The role is passed to AppShell via{" "}
            <code
              style={{
                backgroundColor: "hsl(var(--background))",
                padding: "0.125rem 0.25rem",
                borderRadius: "0.25rem",
              }}
            >
              contextData
            </code>
          </li>
          <li>
            A guard checks{" "}
            <code
              style={{
                backgroundColor: "hsl(var(--background))",
                padding: "0.125rem 0.25rem",
                borderRadius: "0.25rem",
              }}
            >
              context.role
            </code>{" "}
            and returns{" "}
            <code
              style={{
                backgroundColor: "hsl(var(--background))",
                padding: "0.125rem 0.25rem",
                borderRadius: "0.25rem",
              }}
            >
              hidden()
            </code>{" "}
            for non-admins
          </li>
          <li>
            Switch to &quot;Staff&quot; role in the sidebar to see this page
            disappear
          </li>
        </ul>
      </div>
    </div>
  );
};
