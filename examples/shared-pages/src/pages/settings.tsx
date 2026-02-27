import type { SVGProps } from "react";

// ============================================================================
// Icons
// ============================================================================

export const UserIcon = (props: SVGProps<SVGSVGElement>) => {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
};

// ============================================================================
// Profile Settings Page
// ============================================================================

export const ProfileSettingsPage = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Profile Settings
      </h1>
      <div
        style={{
          padding: "1rem",
          backgroundColor: "hsl(var(--muted))",
          borderRadius: "0.5rem",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <p style={{ marginBottom: "0.75rem" }}>
          Manage your account settings and preferences.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <span style={{ fontWeight: "600" }}>Name:</span>
          <span>Demo User</span>
          <span style={{ fontWeight: "600" }}>Email:</span>
          <span>demo@example.com</span>
          <span style={{ fontWeight: "600" }}>Role:</span>
          <span>Admin</span>
        </div>
      </div>
    </div>
  );
};
