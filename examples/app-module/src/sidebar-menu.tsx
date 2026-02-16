import { useRoleSwitcher, type Role } from "./role-switcher";

export const SidebarMenu = () => {
  const { role, setRole } = useRoleSwitcher();

  return (
    <div
      style={{
        borderTop: "1px solid #e5e7eb",
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
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            backgroundColor: "#fafafa",
          }}
        >
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
      </div>
    </div>
  );
};
