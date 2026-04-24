// Renderer-process view code. Runs inside the webview.
//
// This file is intentionally framework-free — plain DOM + JS — so the
// behavior is identical on every Electrobun target (WKWebView / WebView2 /
// WebKitGTK / CEF / WPE-on-DRM) with zero conditionals.

const framesEl = document.getElementById("frames") as HTMLElement;
const clicksEl = document.getElementById("clicks") as HTMLElement;
const button   = document.getElementById("press") as HTMLButtonElement;

let frames = 0;
const tick = (): void => {
  frames += 1;
  framesEl.textContent = String(frames);
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

let clicks = 0;
button.addEventListener("click", () => {
  clicks += 1;
  clicksEl.textContent = String(clicks);
  document.documentElement.style.setProperty(
    "--accent",
    `hsl(${(clicks * 37) % 360} 95% 62%)`,
  );
});

// Periodic heartbeat to the host stdout; useful for headless debugging of
// the embedded target (no devtools on a bare-DRM kiosk).
setInterval(() => {
  console.log(`[hello-embedded] frames=${frames} clicks=${clicks}`);
}, 2000);
