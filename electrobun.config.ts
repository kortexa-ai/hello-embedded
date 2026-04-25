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
    views: {
      main: {
        entrypoint: "src/main/index.ts",
      },
    },
    copy: {
      "src/main/index.html": "views/main/index.html",
      "src/main/page2.html": "views/main/page2.html",
    },
    // Bare-DRM kiosk target. When building on Linux this selects
    // libNativeWrapper_wpe.so (WPE + DRM/KMS + libinput). Ignored when
    // building on macOS / Windows — those targets never consult build.linux.*.
    linux: { embedded: true },
  },
} satisfies ElectrobunConfig;
