import { useRoleSwitcher, type Role } from "./role-switcher";

export const SidebarMenu = () => {
  const { role, setRole } = useRoleSwitcher();

  return (
    <div
      style={{
        borderTop: "1px solid var(--sidebar-border)",
        padding: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <label htmlFor="role-select" style={{ fontSize: "14px" }}>
          Role:
        </label>
        <select
          id="role-select"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role);
          }}
          style={{
            flex: 1,
            fontSize: "14px",
            padding: "4px 8px",
            border: "1px solid var(--sidebar-border)",
            borderRadius: "4px",
            backgroundColor: "var(--sidebar-accent)",
            color: "var(--sidebar-foreground)",
          }}
        >
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
      </div>
    </div>
  );
};
