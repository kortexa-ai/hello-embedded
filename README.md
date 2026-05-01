# hello-embedded

Reference Electrobun app, written **once** to run as a real macOS desktop
app *and* as a bare-DRM kiosk on a Raspberry Pi — same source, no
per-target code in the app itself.

The desktop side uses Vite + React 19 + Tailwind v4 with HMR; the
kiosk side runs the same React bundle on WPE WebKit directly on the
panel's framebuffer (no compositor, no window manager) via the
`linux-embedded` target in
[`../electrobun/linux-wpe.md`](../electrobun/linux-wpe.md). Auto-update
machinery comes from
[`../electrobun/linux-wpe-ota.md`](../electrobun/linux-wpe-ota.md).

## What it does today

A "Hello, Electrobun." React app with three pages — main, page 2,
about — exercising:

- **Cross-target single source.** No `if (process.platform === ...)` in
  app code. The framework picks the backend at build time:
  WKWebView on macOS, WebKitGTK on Linux desktop, WebView2 on Windows,
  WPE WebKit on bare-DRM (Pi).
- **Vite HMR dev loop.** Edit `.tsx`, see the change reflected in the
  running app on a Mac in <100 ms (and on a Pi too, when
  `vite --port 5174` is reachable on the network — the launcher's
  `getMainViewUrl()` HEAD-probes it and falls back to the bundled
  `views://mainview/` URL otherwise).
- **Tailwind v4** styled components with `100vw / 100vh` layout — the
  same markup fills a 1200×400 desktop window or the kiosk's 1920×480
  panel without changes.
- **Native macOS titlebar + app menus** (File / Edit / Window roles,
  ⌘Q / ⌘C / ⌘V / ⌘M / ⌘W bindings) and an **About window** that opens
  as a secondary `BrowserWindow`.
- **Auto-injected chrome bar on linux-embedded** — title + fullscreen
  (⛶) + close (×). Tap ⛶ to hide the bar; tap the top edge of the panel
  to bring it back. State persists across navigations within the run.
  The same `titleBarStyle: "default"` in `src/bun/index.ts` gives a
  native titlebar on desktop and an injected chrome bar on the kiosk.
- **Click → navigate between pages** within the same webview, the
  framework's `decide-policy` / `did-navigate` events firing on both
  desktop and kiosk.

## Project layout

```
hello-embedded/
├── package.json
├── electrobun.config.ts        — channels, embedded flag, copy mappings
├── vite.config.ts              — vite for the view bundle (mainview/)
├── postcss.config.js           — tailwind v4
├── tsconfig.json
├── build.sh                    — build for current host OS (macOS or Linux)
├── run.sh                      — build + launch for current host OS
└── src/
    ├── bun/
    │   └── index.ts            — main process: window, menu, About, HMR probe
    └── mainview/
        ├── index.html          — page 1 (loads index.tsx)
        ├── index.tsx           — React root for page 1
        ├── App.tsx             — main component
        ├── page2.html          — page 2
        ├── about.html          — about (opens as separate window on macOS)
        ├── about.tsx
        ├── AboutView.tsx
        ├── index.css           — tailwind imports
        └── bunny.png
```

## Building and running

### macOS

```bash
./run.sh --dev          # vite HMR + electrobun watch (hot reload, edit + see)
./run.sh --canary       # ad-hoc signed canary build, opens via `open <APP>.app`
./run.sh --prod         # ad-hoc signed prod build
./run.sh --clean        # rm -rf dist build node_modules/.vite
```

Ad-hoc signing (`codesign --sign -`) gives the app a stable code identity
on this machine so macOS doesn't re-prompt for permissions on each
launch. Other Macs will still flag the bundle as unidentified — for
distribution we'd need Apple Developer ID + notarization, not handled
here.

### Raspberry Pi (linux-embedded)

```bash
./run.sh --canary       # build + extract installer + ./installer --no-kiosk + run
                        # (TTY-mode dev install: no systemd, no auto-start)
```

`run.sh --canary` on Linux does what `open <APP>.app` does on macOS — it
self-installs the build to `~/.local/share/<id>/<channel>/current/` and
exec's the launcher. The kiosk grabs DRM master from whatever VT it's
launched under and renders directly to the panel until the launcher
exits (e.g. via the chrome bar's × button → back to your TTY).

For a "real" deployment install with systemd kiosk service that
auto-starts at boot:

```bash
tar -xzf artifacts/<channel>-linux-arm64-*-Setup.tar.gz -C /tmp/inst
/tmp/inst/installer        # writes systemd user unit + linger + enables
```

To uninstall: `/tmp/inst/installer --uninstall` (or `--uninstall --keep-data`
to preserve the app dirs). The running app can also flip kiosk on/off
at runtime via `Electrobun.Kiosk.install()` / `Kiosk.uninstall()`.

### Vite HMR on the Pi (cross-machine dev)

If you run `bun run hmr` on a Mac (or any machine on the same LAN) the
running kiosk on the Pi will pick up the dev server automatically — the
launcher's `getMainViewUrl()` HEAD-probes `http://localhost:5174` and
prefers it when reachable. So edit React on your laptop, see it reload
on the panel.

## What's pending

Tracked in detail in `../electrobun/linux-wpe-ota.md` and the project
backlog. The relevant deltas for hello-embedded:

- **OTA Phase B + C.** Phase A is done (versioned dirs + systemd unit
  install). Phase B (service-aware apply: stop service → atomic symlink
  flip → restart) and Phase C (auto-rollback if a new build doesn't
  reach steady-state) are pending. Until they land, updates need
  manual `./installer` reruns.
- **three.js + WebGPU.** The original aspiration of the linux-wpe work
  was a single WebGPU app rendering to the panel via Dawn / Vulkan via
  `VK_KHR_display`. Phases 3–5 of `linux-wpe.md` are deferred until the
  basic app-building experience is solid.
- **Proper menus on linux-embedded.** macOS gets full app menus today.
  On the kiosk there's no menu bar concept — for now only the
  auto-injected chrome's close/fullscreen surfaces interactive UI
  outside the page.
- **Secondary windows on linux-embedded.** "About" opens as a
  separate `BrowserWindow` on macOS today. The WPE backend is
  single-window (one panel = one window) so on the kiosk the About
  window just isn't shown. Possible future: render About as an
  overlay BrowserView via the chrome partition convention.

## Why this exists

Same JS source, four targets:

| Target            | Webview               | GPU backend (future)                 | Display                 |
|-------------------|-----------------------|--------------------------------------|-------------------------|
| macOS             | WKWebView             | Dawn / Metal                         | AppKit                  |
| Windows           | WebView2              | Dawn / D3D12                         | Win32                   |
| Linux desktop     | WebKitGTK (or CEF)    | Dawn / Vulkan                        | X11 or Wayland via GTK  |
| **Linux embedded**| **WPE WebKit**        | **Dawn / Vulkan via VK_KHR_display** | **DRM/KMS, no compositor** |

hello-embedded is the smallest interesting app that exercises that
contract end-to-end while we're filling in the linux-embedded backend.
