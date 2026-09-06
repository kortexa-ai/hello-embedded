import { expect, test } from "bun:test";
import { resolveMainViewUrl } from "./startup";

test("release startup never probes a development server", async () => {
  expect(await resolveMainViewUrl(true, "http://localhost", () => { throw Error("unexpected probe"); }))
    .toBe("views://mainview/index.html");
});
test("bad and hanging dev servers fall back within the deadline", async () => {
  expect(await resolveMainViewUrl(false, "http://localhost", async () => new Response(null, { status: 404 })))
    .toBe("views://mainview/index.html");
  expect(await resolveMainViewUrl(false, "http://localhost", () => new Promise(() => {}), 10))
    .toBe("views://mainview/index.html");
});
