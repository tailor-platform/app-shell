import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// Shared assistant-panel state: the toggle lives in the global top bar (App.tsx)
// while the panel itself is rendered in the body columns (panels-body.tsx).
type AssistantValue = { assistantOpen: boolean; toggleAssistant: () => void };

const AssistantContext = createContext<AssistantValue | null>(null);

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [assistantOpen, setAssistantOpen] = useState(true);
  const value = useMemo<AssistantValue>(
    () => ({ assistantOpen, toggleAssistant: () => setAssistantOpen((o) => !o) }),
    [assistantOpen],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
};

export const useAssistant = (): AssistantValue => {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
};
