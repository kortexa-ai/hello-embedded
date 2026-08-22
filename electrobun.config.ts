import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Hello Electrobun",
    // Reverse-DNS of kortexa.ai. (Was "sh.kortexa.*", cargo-culted from
    // upstream's sh.blackboard.* — blackboard.sh really is their domain.)
    // NOTE: the identifier keys cache/data paths (~/.cache/<identifier>) and
    // the kiosk systemd unit name; existing installs will re-provision under
    // the new name and leave the old dirs behind.
    identifier: "ai.kortexa.hello-embedded",
    version: "0.1.0",
  },
  build: {
    mainProcess: "cottontail",
    cottontail: {
      entrypoint: "src/bun/index.ts",
      // electrobun/bun currently re-exports the full Three.js and Babylon.js
      // stacks. Minifying keeps their unavoidable bundle cost from becoming
      // unnecessary parse time on slower embedded CPUs.
      minify: true,
    },
    // Vite owns the renderer bundle now; pull its dist/ into views/mainview/.
    // `vite build` runs ahead of `electrobun build` via the npm scripts.
    copy: {
      "dist/mainview/index.html": "views/mainview/index.html",
      "dist/mainview/page2.html": "views/mainview/page2.html",
      "dist/mainview/about.html": "views/mainview/about.html",
      "dist/mainview/perf.html": "views/mainview/perf.html",
      "dist/mainview/three.html": "views/mainview/three.html",
      "dist/mainview/assets": "views/mainview/assets",
    },
    watchIgnore: ["dist/**"],
    mac: {
      icons: "icon.iconset",
      bundleCEF: false,
      codesign: true,
      createDmg: true,
      // Hutch notarizes and staples both the inner payload and outer
      // self-extractor before packaging the DMG.
      notarize: true,
    },
    linux: { bundleCEF: false },
    win: { bundleCEF: false },
  },
} satisfies ElectrobunConfig;
