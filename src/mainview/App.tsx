import { useEffect, useRef, useState } from "react";
import bunnyUrl from "./bunny.png";

export function App() {
  const [frames, setFrames] = useState(0);
  const [clicks, setClicks] = useState(0);

  // Frame counter via rAF — same smoke test as the vanilla version.
  const framesRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      framesRef.current += 1;
      setFrames(framesRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Periodic stdout heartbeat for headless debugging on bare-DRM kiosks.
  useEffect(() => {
    const id = setInterval(() => {
      console.log(
        `[hello-embedded] frames=${framesRef.current} clicks=${clicks}`,
      );
    }, 2000);
    return () => clearInterval(id);
  }, [clicks]);

  const accentHue = (clicks * 37) % 360;

  return (
    <div
      className="flex h-screen w-screen items-center justify-center bg-gradient-to-r from-[#cc3300] to-[#ff8a00] text-[#fff5e6] font-sans select-none"
      style={{ ["--accent" as never]: `hsl(${accentHue} 95% 62%)` }}
    >
      <div className="flex flex-col items-center gap-2">
        <img
          src={bunnyUrl}
          alt="hello-embedded"
          className="h-[clamp(64px,14vmin,128px)] w-auto drop-shadow-lg"
        />
        <h1 className="text-[clamp(48px,12vmin,120px)] font-extrabold leading-none">
          Hello, Electrobun
          <span className="text-[var(--accent)]">.</span>
        </h1>
        <div className="text-[clamp(16px,3.5vmin,28px)] opacity-90">
          Frame <span className="font-semibold">{frames}</span> · Clicks{" "}
          <span className="font-semibold">{clicks}</span>
        </div>
        <button
          type="button"
          onClick={() => setClicks((c) => c + 1)}
          className="mt-2 rounded-md bg-[#1a1a1a] px-6 py-2 text-[clamp(14px,3vmin,20px)] font-semibold text-[#fff5e6] shadow-md transition hover:scale-105 active:scale-95"
        >
          Press me
        </button>
        {/* Navigation smoke test (linux-wpe §16). */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = "./page2.html";
            }}
            className="rounded-md border border-[#fff5e6]/40 px-4 py-1.5 text-sm hover:bg-[#fff5e6]/10"
          >
            tap: page 2
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-[#fff5e6]/40 px-4 py-1.5 text-sm hover:bg-[#fff5e6]/10"
          >
            tap: self-reload
          </button>
        </div>
      </div>
    </div>
  );
}
