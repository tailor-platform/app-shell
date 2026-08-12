import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RealAuthDemoApp } from "./RealAuthDemoApp";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RealAuthDemoApp />
  </StrictMode>,
);
