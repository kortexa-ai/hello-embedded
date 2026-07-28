import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { logViewport } from "./viewportDiagnostics";
import "./index.css";

logViewport("main");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
