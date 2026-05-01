import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Hello Electrobun",
    identifier: "sh.kortexa.hello-embedded",
    version: "0.1.0",
  },
  build: {
    useAsar: true,
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    // Vite owns the renderer bundle now; pull its dist/ into views/mainview/.
    // `vite build` runs ahead of `electrobun build` via the npm scripts.
    copy: {
      "dist/mainview/index.html": "views/mainview/index.html",
      "dist/mainview/page2.html": "views/mainview/page2.html",
      "dist/mainview/about.html": "views/mainview/about.html",
      "dist/mainview/assets": "views/mainview/assets",
    },
    watchIgnore: ["dist/**"],
    mac: {
      icons: "icon.iconset",
    },
    // Bare-DRM kiosk target. When building on Linux this selects
    // libNativeWrapper_wpe.so (WPE + DRM/KMS + libinput). Ignored when
    // building on macOS / Windows — those targets never consult build.linux.*.
    linux: { embedded: true },
  },
} satisfies ElectrobunConfig;
