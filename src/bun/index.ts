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

new BrowserWindow({
  title: "Hello, Electrobun",
  url: "views://main/index.html",
  // 1200×400 on desktop gives the same landscape-bar proportions as the
  // Pi kiosk (1920×480). The view's HTML uses 100vw/100vh so it fills
  // whatever window it gets.
  frame: { x: 100, y: 100, width: 1200, height: 400 },
  titleBarStyle: "default",
});
