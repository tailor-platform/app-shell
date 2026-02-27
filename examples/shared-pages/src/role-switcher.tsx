import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";

// ============================================================================
// Role Types
// ============================================================================

export type Role = "admin" | "staff";

// ============================================================================
// Module Augmentation for AppShell ContextData
// ============================================================================

/**
 * Augment AppShellRegister to define the expected contextData type.
 * This makes it clear what context data this module expects from the host app.
 */
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      /**
       * Current user role for access control
       */
      role: Role;
    };
  }
}

// ============================================================================
// Context Type
// ============================================================================

export type RoleSwitcherContextType = {
  /**
   * Current active role
   */
  role: Role;

  /**
   * Switch to a different role
   */
  setRole: (role: Role) => void;
};

// ============================================================================
// Context
// ============================================================================

const RoleSwitcherContext = createContext<RoleSwitcherContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

type RoleSwitcherProviderProps = {
  children: React.ReactNode;
  /**
   * Initial role. Defaults to "staff"
   */
  defaultRole?: Role;
};

export const RoleSwitcherProvider = ({
  children,
  defaultRole = "staff",
}: RoleSwitcherProviderProps) => {
  const [role, setRoleState] = useState<Role>(defaultRole);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
  }, []);

  const value: RoleSwitcherContextType = {
    role,
    setRole,
  };

  return (
    <RoleSwitcherContext.Provider value={value}>
      {children}
    </RoleSwitcherContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useRoleSwitcher = (): RoleSwitcherContextType => {
  const context = useContext(RoleSwitcherContext);
  if (!context) {
    throw new Error(
      "useRoleSwitcher must be used within a RoleSwitcherProvider",
    );
  }
  return context;
};

// ============================================================================
// Export context for direct access if needed
// ============================================================================

export { RoleSwitcherContext };
