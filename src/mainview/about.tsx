import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { About } from "./AboutView";
import { logViewport } from "./viewportDiagnostics";
import "./index.css";

logViewport("about");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <About />
  </StrictMode>,
);
