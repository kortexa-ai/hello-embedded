// Main process (Bun runtime).
// Creates a single window pointing at the view in src/mainview/.
// Portable across all Electrobun targets:
//   - macOS:           WKWebView
//   - Windows:         WebView2
//   - Linux desktop:   WebKitGTK (or CEF)
//   - Linux embedded:  WPE WebKit on bare DRM (new target, see linux-wpe.md)
//
// No per-target code in this file. The platform backend is chosen by the
// Electrobun CLI at build time via the target triple.

import { ApplicationMenu, BrowserView, BrowserWindow, app } from "electrobun/bun";

// Application menu: minimum macOS desktop expectations — App / Edit / Window.
// First top-level item with no label is the AppKit "app menu" (named after
// the bundle). Edit's role-based items wire ⌘C/⌘V/⌘Z to NSResponder selectors;
// Window's roles bind ⌘M/⌘W. Bare-key accelerator "q" defaults to Cmd in
// nativeWrapper's parseMenuAccelerator; role:"quit" alone doesn't set a key
// equivalent (no role-default in package/src/native/macos/nativeWrapper.mm).
ApplicationMenu.setApplicationMenu([
  {
    submenu: [
      { label: "About Hello Electrobun", action: "show-about" },
      { type: "separator" },
      { role: "quit", accelerator: "q" },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize", accelerator: "m" },
      { role: "zoom" },
      { role: "close", accelerator: "w" },
      { type: "separator" },
      { role: "bringAllToFront" },
    ],
  },
]);

// About — custom view loaded from views://mainview/about.html. Opened when
// the app-menu item with action "show-about" is clicked. We track the open
// instance so a second click activates the existing window instead of stacking
// duplicates; the global "close" event clears the ref when it gets dismissed.
let aboutWin: BrowserWindow | null = null;
function showAbout() {
  if (aboutWin) {
    aboutWin.activate();
    return;
  }
  aboutWin = new BrowserWindow({
    title: "About Hello Electrobun",
    url: "views://mainview/about.html",
    frame: { x: 200, y: 200, width: 320, height: 320 },
    titleBarStyle: "default",
    // Smoke-test for the WPE backend's process-isolation API: this window's
    // WebProcess is kept separate from the main app's. Trusted same-origin
    // views (the main window + its chrome bar) share a single WebProcess via
    // the related-view link; "untrusted" forces a fresh WPEWebProcess so a
    // compromised origin couldn't read the main app's memory. The About page
    // is harmless app content, but flagging it untrusted exercises the full
    // process-spawn + chrome-close-button path end-to-end.
    trust: "untrusted",
  });
}
app.on("close", (data: unknown) => {
  if (aboutWin && (data as { id: number }).id === aboutWin.id) {
    aboutWin = null;
  }
});
ApplicationMenu.on("application-menu-clicked", (event: unknown) => {
  const action = (event as { data: { action: string } }).data.action;
  if (action === "show-about") showAbout();
});

// HMR: prefer the local vite dev server when reachable, otherwise serve the
// vite-built bundle from inside views://mainview/. The probe fails fast (and
// silently) on linux-embedded kiosks with no network or no vite running.
const VITE_DEV_URL = "http://localhost:5174";
async function getMainViewUrl(): Promise<string> {
  try {
    await fetch(VITE_DEV_URL, { method: "HEAD" });
    console.log(`[bun] HMR: using vite dev server at ${VITE_DEV_URL}`);
    return `${VITE_DEV_URL}/index.html`;
  } catch {
    return "views://mainview/index.html";
  }
}

// Perf probe mode: ELECTROBUN_START_PAGE=perf boots straight into
// views://mainview/perf.html (rAF frame pacing + RPC round-trip probe —
// see src/mainview/perf.ts). Used for headless/kiosk perf runs where
// nobody can click a link.
const startPage = process.env["ELECTROBUN_START_PAGE"];
const perfMode = startPage === "perf";

// RPC for the perf probe: answers its pings and logs its once-a-second
// stats to the bun process log so headless runs can just grep stdout.
const rpc = BrowserView.defineRPC<any>({
  maxRequestTime: 5000,
  handlers: {
    requests: {
      ping: ({ n }: { n: number }) => ({ pong: n }),
    },
    messages: {
      "perf-stats": (s: any) => {
        console.log(
          `[perf] fps=${s.fps} rpcRoundTripMs=${s.rpcRoundTripMs} ticksSeen=${s.ticksSeen}`,
        );
      },
    },
  },
});

const win = new BrowserWindow({
  title: "Hello, Electrobun",
  url: startPage ? `views://mainview/${startPage}.html` : await getMainViewUrl(),
  rpc,
  // Using 1920x436 to provide the same landscape-bar proportions as
  // our Pi kiosk setup (1920x480 minus chrome height).
  // The view's HTML uses 100vw/100vh so it fills whatever window it gets.
  frame: { x: 100, y: 100, width: 1920, height: 436 },
  // On linux-embedded the values map to compositor behavior:
  //   'default'     — Electrobun auto-injects a chrome bar
  //   'hidden'      — fullscreen, no chrome
  //   'hiddenInset' — same as 'hidden' for now
  // On macOS/Windows/Linux-desktop, 'default' gives the native titlebar.
  titleBarStyle: "default",
});

// Optional proving-ground hook for exercising framework-owned WPE chrome
// without a physical tap. Kept inert in normal builds.
const chromeTest = process.env["ELECTROBUN_CHROME_TEST"];
if (chromeTest && win.chromeWebviewId) {
  const chrome = BrowserView.getById(win.chromeWebviewId);
  setTimeout(() => {
    chrome?.executeJavascript(`
      (() => {
        const title = document.getElementById("title");
        const rect = title?.getBoundingClientRect();
        const style = title ? getComputedStyle(title) : null;
        console.log("[chrome-test] " + JSON.stringify({
          mode: ${JSON.stringify(chromeTest)},
          text: title?.textContent,
          rect: rect && [rect.x, rect.y, rect.width, rect.height],
          color: style?.color,
          font: style?.font,
        }));
        if (${JSON.stringify(chromeTest)} === "paint" && title) {
          title.style.background = "#7f006e";
        }
      })();
    `);
  }, 1000);
}

// Navigation smoke test (linux-wpe §16). Confirms the WPE backend's
// decide-policy / load-changed / load-failed signals reach Bun with the
// same shape the GTK backend produces.
type NavEvent = { data: { detail: string } };
win.webview.on("will-navigate", (e: unknown) => {
  console.log("[bun] will-navigate", (e as NavEvent).data.detail);
});
win.webview.on("did-navigate", (e: unknown) => {
  console.log("[bun] did-navigate", (e as NavEvent).data.detail);
});

// Perf probe: push a tick once a second so the page can verify the
// bun→webview socket path stays live (perf.ts counts them as ticksSeen).
// Gated on perf mode — other pages never register a listener and the
// pushes would just queue up in the preload's pending-message buffer.
if (perfMode) {
  setInterval(() => {
    (win.webview.rpc as any)?.send?.tick({ t: Date.now() });
  }, 1000);
}

// Renderer → Bun bridge. The webview calls window.__electrobunSendToHost(msg)
// (set up by Electrobun's preload) and Bun receives it as a "host-message"
// event. Native.ts already JSON.parses the detail for host-message before
// dispatching, so detail is the original object — do NOT JSON.parse again.
// Renderers can't open BrowserWindows directly, so they ask Bun to do it.
win.webview.on("host-message", (e: unknown) => {
  const msg = (e as { data: { detail: { action?: string } } }).data.detail;
  if (msg?.action === "show-about") showAbout();
});
