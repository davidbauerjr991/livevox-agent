import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Lyra tokens (light + dark) — imported exactly once; a second copy would
// override the dark-mode block and the theme toggle would stop working.
import "@nicecxone/lyra-ui/styles";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
