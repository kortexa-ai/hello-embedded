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

import { BrowserWindow } from "electrobun/bun";

const win = new BrowserWindow({
  title: "Hello, Electrobun",
  url: "views://main/index.html",
  // 1200×400 on desktop gives the same landscape-bar proportions as the
  // Pi kiosk (1920×480). The view's HTML uses 100vw/100vh so it fills
  // whatever window it gets.
  frame: { x: 100, y: 100, width: 1200, height: 400 },
  // 'hidden' makes Electrobun's preload pipeline auto-inject a chrome bar
  // (§18 in linux-wpe.md). On macOS/GTK 'hidden' also removes the native
  // titlebar so the in-page bar isn't doubled up; on WPE-on-DRM there's
  // no native titlebar to suppress.
  titleBarStyle: "hidden",
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
