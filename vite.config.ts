import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // GitHub Pages project site — served at a subpath
  // (https://<user>.github.io/livevox-agent/), not the domain root, so built
  // asset URLs need this prefix or they 404.
  base: "/livevox-agent/",
  plugins: [react()],
  resolve: {
    // lyra-ui lives in a sibling folder with its own node_modules — without
    // dedupe, two copies of React load and hooks break.
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nicecxone/lyra-ui/styles": path.resolve(__dirname, "../lyra-ui/src/styles/lyra-tokens.css"),
      "@nicecxone/lyra-ui": path.resolve(__dirname, "../lyra-ui/src/index.ts"),
    },
  },
});
