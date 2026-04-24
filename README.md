# hello-embedded

Minimal portable Electrobun app. **Zero per-target code** — the HTML/JS
is identical on every supported target.

This is the public face of the [`linux-wpe`](../electrobun/linux-wpe.md)
work: a tiny app that builds and runs on stock Electrobun on macOS /
Windows / Linux desktop, *and also* builds as a standalone kiosk binary
for bare-DRM Linux (Raspberry Pi).

## What it does

A bold "Hello, Electrobun." greeting, a frame counter that ticks every
repaint (proves JS is alive), a click counter + a button that rotates
the accent color hue (proves event wiring and DOM mutation). No
framework; plain DOM + TypeScript.

## Project layout

```
hello-embedded/
├── package.json
├── electrobun.config.ts
├── tsconfig.json
└── src/
    ├── bun/
    │   └── index.ts        Main process: creates one BrowserWindow
    └── main/
        ├── index.html      Markup + styles for the single view
        └── index.ts        View-side JS (counter, click handler)
```

## Building

### Desktop (macOS / Windows / Linux desktop) — stock Electrobun

```bash
cd hello-embedded
bun install
bun run build
```

On the Pi or an Ubuntu desktop machine running stock Electrobun, this
produces a normal windowed app. No changes needed.

### Raspberry Pi / bare-DRM kiosk — linux-embedded target

```bash
bun run build:embedded
sudo ./dist/linux-embedded/hello-embedded    # or install the systemd unit
```

This builds against the `linux-embedded` target (see
`../electrobun/linux-wpe.md`) which links `libNativeWrapper_wpe.so`,
grabs DRM master from a free VT, and renders directly onto the
framebuffer via WPE WebKit + WPEBackend-fdo + libdrm. No X, no Wayland,
no compositor.

## What's proven today

Running against the standalone `wpe_hello` test binary in
`../electrobun/package/src/native/linux/wpe/` (which bypasses
Electrobun's FFI/build and talks directly to WPE + DRM):

- HTML parse + CSS layout ✓
- JavaScriptCore ✓ (frame counter ticks at 60 fps)
- DOM mutation from JS ✓
- Capacitive touchscreen → click handler fires ✓
- Console.log routed to host stdout ✓
- No stride artifacts on a non-standard 480×1920 panel ✓
- Rotation handled in CPU blit (→ shader in Phase 4) ✓

Pending for the real Electrobun embedded build: see Phase 2.1–2.5 in
`../electrobun/linux-wpe.md` §11.

## How to try the view on the Pi right now (pre-Electrobun-integration)

```bash
cd ~/src/electrobun/package/src/native/linux/wpe
make wpe_hello
sudo openvt -c 2 -s -f -- ./wpe_hello file:///home/pi/src/hello-embedded/src/main/index.html
# touch the screen to click; Ctrl-Alt-F1 or `sudo chvt 1` to return to the login tty
```

Note: without Electrobun's build pipeline, the view's TypeScript isn't
compiled. Until Phase 2.5 lands, use a compiled `index.js` manually or
inline the JS in the HTML for the standalone test.
