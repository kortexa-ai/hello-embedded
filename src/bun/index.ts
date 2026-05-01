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

import { ApplicationMenu, BrowserWindow, app } from "electrobun/bun";

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

const win = new BrowserWindow({
  title: "Hello, Electrobun",
  url: await getMainViewUrl(),
  // 1200×400 on desktop gives the same landscape-bar proportions as the
  // Pi kiosk (1920×480). The view's HTML uses 100vw/100vh so it fills
  // whatever window it gets.
  frame: { x: 100, y: 100, width: 1200, height: 400 },
  // On linux-embedded the values map to compositor behavior:
  //   'default'     — Electrobun auto-injects a chrome bar
  //   'hidden'      — fullscreen, no chrome
  //   'hiddenInset' — same as 'hidden' for now
  // On macOS/Windows/Linux-desktop, 'default' gives the native titlebar.
  titleBarStyle: "default",
});

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
