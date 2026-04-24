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
    // The `linux-embedded` target (bundleWPE) is set via the CLI flag
    // when building on the Pi. Desktop builds ignore this block entirely.
    // linux: { embedded: true },
  },
} satisfies ElectrobunConfig;
