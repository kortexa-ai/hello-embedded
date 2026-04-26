// Main process (Bun runtime).
// Creates a single window pointing at the view in src/main/.
// Portable across all Electrobun targets:
//   - macOS:           WKWebView
//   - Windows:         WebView2
//   - Linux desktop:   WebKitGTK (or CEF)
//   - Linux embedded:  WPE WebKit on bare DRM (new target, see linux-wpe.md)
//
// No per-target code in this file. The platform backend is chosen by the
// Electrobun CLI at build time via the target triple.

import { BrowserView, BrowserWindow } from "electrobun/bun";

// Chrome bar layout. 40px reads cleanly on the 480-tall kortexa bar while
// still leaving the bulk of the panel for content. Tweak per panel.
const CHROME_HEIGHT = 40;
const APP_FRAME = { x: 100, y: 100, width: 1200, height: 400 };

const win = new BrowserWindow({
  title: "Hello, Electrobun",
  url: "views://main/index.html",
  // 1200×400 on desktop gives the same landscape-bar proportions as the
  // Pi kiosk (1920×480). The view's HTML uses 100vw/100vh so it fills
  // whatever window it gets.
  frame: APP_FRAME,
  // titleBarStyle 'default' keeps the auto-inject chrome from §18 disabled;
  // on the embedded WPE target we instead bring up a real chrome BrowserView
  // below, which exercises the multi-view + z-order backbone end-to-end.
  // (On macOS/GTK 'default' just keeps the native titlebar.)
  titleBarStyle: "default",
});

// Chrome bar — a separate BrowserView in the same window. The magic
// partition name "__electrobun_chrome__" tells the WPE backend to mark
// this view alwaysTopmost (independent of insertion order). Other backends
// (WebKitGTK / WKWebView / WebView2 / CEF) treat the partition as a
// normal cookie partition, which is harmless since they have native
// window-system z-order.
//
// The chrome view overlays the top of the main view rather than displacing
// it (no public BrowserView resize API yet, and the kiosk content already
// reserves vertical space via the auto-inject chrome convention from §18).
new BrowserView({
  windowId: win.id,
  url: "views://chrome/index.html",
  partition: "__electrobun_chrome__",
  frame: { x: 0, y: 0, width: APP_FRAME.width, height: CHROME_HEIGHT },
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
