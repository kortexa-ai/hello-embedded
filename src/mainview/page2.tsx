import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Page2View } from "./Page2View";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page2View />
  </StrictMode>,
);
