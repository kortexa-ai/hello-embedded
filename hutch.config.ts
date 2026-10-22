// @hutch cli=0.28.2-canary.3 cottontail=0.7.3-canary.4
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Local development may be ahead of the published Electrobun release. Keep
// its exact manifest version paired with the selected native artifacts.
const localDevkitRoot = process.env["HUTCH_ELECTROBUN_DEVKIT_ROOT"];
const electrobunVersion = localDevkitRoot
  ? JSON.parse(readFileSync(resolve(import.meta.dirname, localDevkitRoot, "native-devkit.json"), "utf8")).product.version
  : "2.0.2-beta.14";

export default {
  electrobun: {
    version: electrobunVersion,
  },
  packageManager: "bun",
};
