import { createContext } from "react";

// Main and /testing must share this Context through the same Vite runtime graph.
export const AppShellTestingContext = createContext<string[] | null>(null);
