import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LocalAuthDemoApp } from "./LocalAuthDemoApp";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocalAuthDemoApp />
  </StrictMode>,
);
