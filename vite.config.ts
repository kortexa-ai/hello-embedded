import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Multi-page setup: index.html + page2.html share the same src/mainview/ root.
// In dev, vite serves both at http://localhost:5174/{index,page2}.html.
// In prod, vite-build emits them into dist/mainview/, which electrobun.config.ts
// copies into views/mainview/ alongside the asar bundle.
export default defineConfig({
  plugins: [react()],
  // Relative base — emit href="./assets/..." instead of "/assets/...", so the
  // built HTML works under views:// (custom scheme) as well as http://.
  base: "./",
  root: "src/mainview",
  build: {
    outDir: "../../dist/mainview",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/mainview/index.html"),
        page2: resolve(__dirname, "src/mainview/page2.html"),
        about: resolve(__dirname, "src/mainview/about.html"),
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
