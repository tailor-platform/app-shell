import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Dogfood: the docs explorer is styled by the same theme it documents.
// index.css wires Tailwind + app-shell styles + theme (the canonical consumer setup).
import "./index.css";

import App from "./App";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
