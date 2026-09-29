import { createContext, useContext } from "react";

import type { AIChatStatus } from "@/ai/use-ai-chat";

type AIChatContextValue = {
  status: AIChatStatus;
};

const AIChatContext = createContext<AIChatContextValue | null>(null);

function useAIChatContext(component: string): AIChatContextValue {
  const ctx = useContext(AIChatContext);
  if (!ctx) throw new Error(`<${component}> must be used within <AIChat>`);
  return ctx;
}

export { AIChatContext, useAIChatContext, type AIChatContextValue };
