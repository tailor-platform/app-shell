import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type BreadcrumbOverrideContextValue = {
  overrides: Map<string, string>;
  register: (path: string, title: string) => void;
  unregister: (path: string) => void;
};

const BreadcrumbOverrideContext =
  createContext<BreadcrumbOverrideContextValue | null>(null);

export const BreadcrumbOverrideProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [overrides, setOverrides] = useState<Map<string, string>>(
    () => new Map(),
  );

  const register = useCallback((path: string, title: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(path, title);
      return next;
    });
  }, []);

  const unregister = useCallback((path: string) => {
    setOverrides((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
  }, []);

  return (
    <BreadcrumbOverrideContext.Provider
      value={{ overrides, register, unregister }}
    >
      {children}
    </BreadcrumbOverrideContext.Provider>
  );
};

export const useBreadcrumbOverride = () => {
  const context = useContext(BreadcrumbOverrideContext);
  if (!context) {
    throw new Error(
      "useBreadcrumbOverride must be used within BreadcrumbOverrideProvider",
    );
  }
  return context;
};
