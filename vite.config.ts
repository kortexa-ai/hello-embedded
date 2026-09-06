import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { electrobunViteAliases } from "./.hutch/devkit/api/config/electrobun-vite.ts";

// Multi-page setup: index.html + page2.html share the same src/mainview/ root.
// In dev, vite serves both at http://localhost:5174/{index,page2}.html.
// In prod, vite-build emits them into dist/mainview/, which electrobun.config.ts
// copies into views/mainview/ alongside the asar bundle.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: electrobunViteAliases(resolve(import.meta.dirname, ".hutch/devkit")) },
  // Relative base — emit href="./assets/..." instead of "/assets/...", so the
  // built HTML works under views:// (custom scheme) as well as http://.
  base: "./",
  root: "src/mainview",
  build: {
    outDir: "../../dist/mainview",
    emptyOutDir: true,
    // three.html is an isolated full Three.js API playground. Its single
    // 528 kB chunk is intentional; splitting it would add requests without
    // reducing the code needed by that page.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "src/mainview/index.html"),
        page2: resolve(import.meta.dirname, "src/mainview/page2.html"),
        about: resolve(import.meta.dirname, "src/mainview/about.html"),
        perf: resolve(import.meta.dirname, "src/mainview/perf.html"),
        three: resolve(import.meta.dirname, "src/mainview/three.html"),
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
